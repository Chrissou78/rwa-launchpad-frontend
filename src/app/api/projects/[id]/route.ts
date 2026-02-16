// src/app/api/projects/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), '.projects-storage');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 });
  }
  
  try {
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const data = await readFile(projectPath, 'utf-8');
    const project = JSON.parse(data);
    
    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({
        success: false,
        error: 'Project not found',
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch project',
    }, { status: 500 });
  }
}