import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

// Facebook OAuth Callback Handler
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // projectId
    const error = searchParams.get('error')

    // Error handling
    if (error) {
      console.error('Facebook OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/dashboard/${state}/connect?error=oauth_denied`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/dashboard/${state || ''}/connect?error=missing_params`, request.url)
      )
    }

    const projectId = state

    // 1. Exchange code for access token
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const redirectUri = `${request.nextUrl.origin}/api/auth/facebook/callback`

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `code=${code}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
      { method: 'GET' }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL(`/dashboard/${projectId}/connect?error=token_exchange_failed`, request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    const userAccessToken = tokenData.access_token

    // 2. Get long-lived token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${userAccessToken}`,
      { method: 'GET' }
    )

    let longLivedToken = userAccessToken
    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json()
      longLivedToken = longLivedData.access_token
    }

    // 3. Get user's pages
    console.log('Fetching pages with token:', longLivedToken.substring(0, 20) + '...')

    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`,
      { method: 'GET' }
    )

    const pagesResponseText = await pagesResponse.text()
    console.log('Pages API response:', pagesResponseText)

    if (!pagesResponse.ok) {
      console.error('Failed to get pages:', pagesResponseText)
      return NextResponse.redirect(
        new URL(`/dashboard/${projectId}/connect?error=pages_fetch_failed`, request.url)
      )
    }

    let pagesData
    try {
      pagesData = JSON.parse(pagesResponseText)
    } catch {
      console.error('Failed to parse pages response')
      return NextResponse.redirect(
        new URL(`/dashboard/${projectId}/connect?error=pages_fetch_failed`, request.url)
      )
    }

    const pages = pagesData.data || []
    console.log('Found pages:', pages.length, pages.map((p: any) => p.name))

    if (pages.length === 0) {
      console.log('No pages found. User may not be admin of any pages or missing permissions.')
      return NextResponse.redirect(
        new URL(`/dashboard/${projectId}/connect?error=no_pages`, request.url)
      )
    }

    // 4. Save pages to database
    const supabase = createServerClient()
    let savedCount = 0

    for (const page of pages) {
      // Check if already connected
      const { data: existing } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('project_id', projectId)
        .eq('page_id', page.id)
        .single()

      if (existing) {
        // Update existing
        await supabase
          .from('social_accounts')
          .update({
            access_token: page.access_token,
            page_name: page.name,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Insert new
        await supabase
          .from('social_accounts')
          .insert({
            project_id: projectId,
            platform: 'facebook',
            page_id: page.id,
            page_name: page.name,
            access_token: page.access_token,
            is_active: true,
            connected_at: new Date().toISOString()
          })
      }
      savedCount++

      // 5. Subscribe to webhook for this page
      try {
        await fetch(
          `https://graph.facebook.com/v18.0/${page.id}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscribed_fields: ['messages', 'messaging_postbacks', 'message_deliveries', 'message_reads'],
              access_token: page.access_token
            })
          }
        )
      } catch (webhookError) {
        console.error('Webhook subscription failed for page:', page.id, webhookError)
      }

      // 6. Check if page has connected Instagram
      try {
        const igResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
          { method: 'GET' }
        )

        if (igResponse.ok) {
          const igData = await igResponse.json()
          if (igData.instagram_business_account) {
            const igAccountId = igData.instagram_business_account.id

            // Get Instagram account info
            const igInfoResponse = await fetch(
              `https://graph.facebook.com/v18.0/${igAccountId}?fields=username,name&access_token=${page.access_token}`,
              { method: 'GET' }
            )

            if (igInfoResponse.ok) {
              const igInfo = await igInfoResponse.json()

              // Check if IG already connected
              const { data: existingIg } = await supabase
                .from('social_accounts')
                .select('id')
                .eq('project_id', projectId)
                .eq('page_id', igAccountId)
                .single()

              if (!existingIg) {
                await supabase
                  .from('social_accounts')
                  .insert({
                    project_id: projectId,
                    platform: 'instagram',
                    page_id: igAccountId,
                    page_name: igInfo.username || igInfo.name || 'Instagram Account',
                    access_token: page.access_token, // Use page token for IG
                    is_active: true,
                    connected_at: new Date().toISOString()
                  })
                savedCount++
              }
            }
          }
        }
      } catch (igError) {
        console.error('Instagram check failed:', igError)
      }
    }

    // Success redirect
    return NextResponse.redirect(
      new URL(`/dashboard/${projectId}/connect?success=true&count=${savedCount}`, request.url)
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/connect?error=server_error`, request.url)
    )
  }
}
