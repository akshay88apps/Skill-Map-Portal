import { NextRequest,NextResponse } from 'next/server';import { db } from '@/lib/db';import { isAdmin } from '@/lib/authz';
export async function GET(req:NextRequest){if(!isAdmin(req))return NextResponse.json({error:'Forbidden'},{status:403});return NextResponse.json(await db.reviewItem.findMany({where:{status:'PENDING'},orderBy:{createdAt:'asc'}}))}
