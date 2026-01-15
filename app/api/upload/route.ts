import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

// POST - Зураг upload хийх
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const formData = await request.formData()

    const file = formData.get('file') as File
    const projectId = formData.get('project_id') as string
    const productId = formData.get('product_id') as string

    if (!file || !projectId) {
      return NextResponse.json({ error: 'file and project_id required' }, { status: 400 })
    }

    // Файлын нэр үүсгэх
    const fileExt = file.name.split('.').pop()
    const fileName = `${projectId}/${productId || 'general'}/${Date.now()}.${fileExt}`

    // Supabase Storage руу upload
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Public URL авах
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// DELETE - Зураг устгах
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { path } = await request.json()

    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 })
    }

    const { error } = await supabase.storage
      .from('product-images')
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
