import { Router } from 'express';
import { verifyAccount, resendVerification } from '../controllers/verify.controller';

const router = Router();

router.post('/auth/verify', verifyAccount);
router.post('/auth/verify/resend', resendVerification);

export default router;
