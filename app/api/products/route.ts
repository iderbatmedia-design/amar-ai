import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

// GET - Project-ийн бүх products авах
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase GET error:', error)
      throw error
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST - Шинэ product үүсгэх
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    console.log('Creating product with data:', JSON.stringify(body, null, 2))

    const { project_id, name, description, price, features, stock, category, sku, is_active } = body

    if (!project_id || !name) {
      return NextResponse.json(
        { error: 'project_id and name are required' },
        { status: 400 }
      )
    }

    const insertData = {
      project_id,
      name,
      description: description || null,
      price: price || null,
      features: features || null,
      stock: stock || 0,
      category: category || null,
      sku: sku || null,
      is_active: is_active ?? true
    }

    console.log('Insert data:', JSON.stringify(insertData, null, 2))

    const { data: product, error } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase POST error:', JSON.stringify(error, null, 2))
      return NextResponse.json({
        error: error.message || 'Database error',
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }

    console.log('Product created successfully:', product?.id)
    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({
      error: error?.message || 'Failed to create product',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

// PATCH - Product шинэчлэх
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'product id is required' }, { status: 400 })
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}
