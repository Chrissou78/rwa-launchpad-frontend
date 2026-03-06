// src/app/api/projects/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PROJECTS_DIR = path.join(process.cwd(), '.projects-storage');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'projects');

interface Milestone {
  id: string;
  title: string;
  description: string;
  percentage: number;
  targetDate: string;
  deliverables: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
}

interface ProjectData {
  id: string;
  creator: string;
  name: string;
  description: string;
  category: string;
  status: 'draft' | 'pending_review' | 'active' | 'funded' | 'completed' | 'cancelled';
  
  // Currency & Funding
  localCurrency: string;
  fundingGoalLocal: number;
  fundingGoalUSD: number;
  minInvestmentLocal: number;
  minInvestmentUSD: number;
  maxInvestmentLocal?: number;
  maxInvestmentUSD?: number;
  exchangeRate: number;
  exchangeRateTimestamp: number;
  acceptedTokens: string[];
  
  // Progress
  currentFundingUSD: number;
  currentFundingLocal: number;
  investorCount: number;
  
  // Milestones
  milestones: Milestone[];
  currentMilestoneIndex: number;
  
  // Timeline
  startDate: string;
  endDate: string;
  
  // Token
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  pricePerTokenLocal: number;
  pricePerTokenUSD: number;
  tokenAddress?: string;
  
  // Documents
  documents: {
    businessPlanUrl?: string;
    financialProjectionsUrl?: string;
    legalDocumentsUrl?: string;
  };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  contractAddress?: string;
  transactionHash?: string;
}

async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    // Directory exists
  }
}

async function saveFile(file: File, projectId: string, type: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const filename = `${type}-${uuidv4()}.${ext}`;
  const projectDir = path.join(UPLOADS_DIR, projectId);
  
  await ensureDir(projectDir);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(projectDir, filename);
  await writeFile(filePath, buffer);
  
  return `/uploads/projects/${projectId}/${filename}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract basic fields
    const creator = formData.get('creator') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    
    // Validate required fields
    if (!creator || !name || !description || !category) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }
    
    // Generate project ID
    const projectId = uuidv4();
    
    // Extract currency & funding data
    const localCurrency = formData.get('localCurrency') as string || 'USD';
    const fundingGoalLocal = parseFloat(formData.get('fundingGoalLocal') as string) || 0;
    const fundingGoalUSD = parseFloat(formData.get('fundingGoalUSD') as string) || fundingGoalLocal;
    const minInvestmentLocal = parseFloat(formData.get('minInvestmentLocal') as string) || 0;
    const minInvestmentUSD = parseFloat(formData.get('minInvestmentUSD') as string) || minInvestmentLocal;
    const maxInvestmentLocal = formData.get('maxInvestmentLocal') ? parseFloat(formData.get('maxInvestmentLocal') as string) : undefined;
    const maxInvestmentUSD = formData.get('maxInvestmentUSD') ? parseFloat(formData.get('maxInvestmentUSD') as string) : undefined;
    const exchangeRate = parseFloat(formData.get('exchangeRate') as string) || 1;
    const acceptedTokens = JSON.parse(formData.get('acceptedTokens') as string || '["USDT"]');
    
    // Extract milestones
    const milestones: Milestone[] = JSON.parse(formData.get('milestones') as string || '[]');
    
    // Validate milestones
    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
    if (milestones.length > 0 && totalPercentage !== 100) {
      return NextResponse.json({
        success: false,
        error: `Milestone percentages must total 100% (got ${totalPercentage}%)`,
      }, { status: 400 });
    }
    
    // Extract timeline
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    
    // Extract token details
    const tokenName = formData.get('tokenName') as string;
    const tokenSymbol = formData.get('tokenSymbol') as string;
    const totalSupply = parseFloat(formData.get('totalSupply') as string) || 0;
    const pricePerTokenLocal = parseFloat(formData.get('pricePerTokenLocal') as string) || 0;
    const pricePerTokenUSD = parseFloat(formData.get('pricePerTokenUSD') as string) || pricePerTokenLocal;
    
    // Handle file uploads
    const documents: ProjectData['documents'] = {};
    
    const businessPlan = formData.get('businessPlan') as File | null;
    if (businessPlan && businessPlan.size > 0) {
      documents.businessPlanUrl = await saveFile(businessPlan, projectId, 'business-plan');
    }
    
    const financialProjections = formData.get('financialProjections') as File | null;
    if (financialProjections && financialProjections.size > 0) {
      documents.financialProjectionsUrl = await saveFile(financialProjections, projectId, 'financial-projections');
    }
    
    const legalDocuments = formData.get('legalDocuments') as File | null;
    if (legalDocuments && legalDocuments.size > 0) {
      documents.legalDocumentsUrl = await saveFile(legalDocuments, projectId, 'legal-documents');
    }
    
    // Create project data
    const projectData: ProjectData = {
      id: projectId,
      creator: creator.toLowerCase(),
      name,
      description,
      category,
      status: 'pending_review',
      
      localCurrency,
      fundingGoalLocal,
      fundingGoalUSD,
      minInvestmentLocal,
      minInvestmentUSD,
      maxInvestmentLocal,
      maxInvestmentUSD,
      exchangeRate,
      exchangeRateTimestamp: Date.now(),
      acceptedTokens,
      
      currentFundingUSD: 0,
      currentFundingLocal: 0,
      investorCount: 0,
      
      milestones: milestones.map(m => ({
        ...m,
        status: 'pending' as const,
      })),
      currentMilestoneIndex: 0,
      
      startDate,
      endDate,
      
      tokenName,
      tokenSymbol,
      totalSupply,
      pricePerTokenLocal,
      pricePerTokenUSD,
      
      documents,
      
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Save project data
    await ensureDir(PROJECTS_DIR);
    const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
    await writeFile(projectPath, JSON.stringify(projectData, null, 2));
    
    console.log(`[Projects] Created project ${projectId} by ${creator}`);
    
    return NextResponse.json({
      success: true,
      projectId,
      message: 'Project created successfully',
      project: {
        id: projectId,
        name,
        status: 'pending_review',
        fundingGoalUSD,
        localCurrency,
      },
    });
    
  } catch (error: any) {
    console.error('[Projects] Create error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create project',
    }, { status: 500 });
  }
}