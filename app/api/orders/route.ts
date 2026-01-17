import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

// GET - Project-ийн захиалгууд авах
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          name,
          platform,
          platform_user_id
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST - Шинэ захиалга үүсгэх (AI-аас дуудагдана)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const {
      project_id,
      customer_id,
      conversation_id,
      items,
      total_amount,
      customer_phone,
      customer_address,
      customer_name,
      notes
    } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    // Захиалга үүсгэх
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        project_id,
        customer_id: customer_id || null,
        conversation_id: conversation_id || null,
        items: items || [],
        total_amount: total_amount || 0,
        customer_phone: customer_phone || null,
        customer_address: customer_address || null,
        customer_name: customer_name || null,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Харилцагчийн статистик шинэчлэх (байвал)
    if (customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('total_orders, total_spent, lead_score')
        .eq('id', customer_id)
        .single()

      if (customer) {
        await supabase
          .from('customers')
          .update({
            total_orders: (customer.total_orders || 0) + 1,
            total_spent: (customer.total_spent || 0) + (total_amount || 0),
            lead_score: 'hot' // Захиалга хийсэн бол hot болгох
          })
          .eq('id', customer_id)
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

// PATCH - Захиалгын статус шинэчлэх
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { id, status, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'order id is required' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = { ...updateData }
    if (status) {
      updatePayload.status = status
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
