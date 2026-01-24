import { Router } from 'express';
import { AuthController } from './auth.controller';

const router: Router = Router();

router.post('/login', AuthController.loginValidation, AuthController.login);
router.post(
    '/register',
    AuthController.registerValidation,
    AuthController.register
);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;
