// src/app/api/projects/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), '.projects-storage');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const creator = searchParams.get('creator');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  try {
    const files = await readdir(PROJECTS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    let projects = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(PROJECTS_DIR, file);
        const data = await readFile(filePath, 'utf-8');
        const project = JSON.parse(data);
        
        // Apply filters
        if (status && project.status !== status) continue;
        if (category && project.category !== category) continue;
        if (creator && project.creator.toLowerCase() !== creator.toLowerCase()) continue;
        
        // Return summary (not full data)
        projects.push({
          id: project.id,
          name: project.name,
          description: project.description.slice(0, 200),
          category: project.category,
          status: project.status,
          creator: project.creator,
          localCurrency: project.localCurrency,
          fundingGoalLocal: project.fundingGoalLocal,
          fundingGoalUSD: project.fundingGoalUSD,
          currentFundingUSD: project.currentFundingUSD,
          currentFundingLocal: project.currentFundingLocal,
          investorCount: project.investorCount,
          tokenSymbol: project.tokenSymbol,
          pricePerTokenUSD: project.pricePerTokenUSD,
          startDate: project.startDate,
          endDate: project.endDate,
          milestoneCount: project.milestones?.length || 0,
          currentMilestoneIndex: project.currentMilestoneIndex || 0,
          createdAt: project.createdAt,
        });
      } catch (e) {
        // Skip invalid files
      }
    }
    
    // Sort by creation date (newest first)
    projects.sort((a, b) => b.createdAt - a.createdAt);
    
    // Apply pagination
    const total = projects.length;
    projects = projects.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({
        success: true,
        projects: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch projects',
    }, { status: 500 });
  }
}