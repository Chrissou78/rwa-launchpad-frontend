import { Router } from 'express';
import { verifyAdminSignature } from '../middleware/auth';
import { blockchainService } from '../services/BlockchainService';

const router = Router();

// Apply admin auth to all routes
router.use(verifyAdminSignature);

// GET /admin/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await blockchainService.getStatistics();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /admin/submissions
router.get('/submissions', async (req, res) => {
  try {
    const { status } = req.query;
    let submissions;
    
    if (status === 'ManualReview') {
      submissions = await blockchainService.getPendingManualReview();
    } else {
      submissions = await blockchainService.getAllSubmissions(status as string);
    }
    
    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

// GET /admin/submission/:address
router.get('/submission/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const submission = await blockchainService.getSubmission(address);
    
    // Get stored documents from your storage service
    // const documents = await storageService.getDocuments(address);
    
    res.json({ 
      success: true, 
      submission: {
        ...submission,
        // idDocumentUrl: documents.idDocument,
        // selfieUrl: documents.selfie,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submission' });
  }
});

// POST /admin/approve
router.post('/approve', async (req, res) => {
  try {
    const { userAddress, level } = req.body;
    
    const tx = await blockchainService.manualApprove(userAddress, level);
    
    res.json({ success: true, txHash: tx.hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /admin/reject
router.post('/reject', async (req, res) => {
  try {
    const { userAddress, reason, details } = req.body;
    
    const tx = await blockchainService.manualReject(userAddress, reason, details);
    
    res.json({ success: true, txHash: tx.hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /admin/revoke
router.post('/revoke', async (req, res) => {
  try {
    const { userAddress, reason } = req.body;
    
    const tx = await blockchainService.revokeKYC(userAddress, reason);
    
    res.json({ success: true, txHash: tx.hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
