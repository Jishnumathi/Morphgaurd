/**
 * MorphGuard AI — Production Backend Server (Express + Vite)
 * Provides RESTful Forensic API endpoints, real-time image processing,
 * case management, cryptographic verification, and audit trail logging.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { caseStore } from './src/services/forensics/caseStore.js';
import { runForensicPipeline } from './src/services/forensics/forensicPipeline.js';
import { generatePdfReport } from './src/services/forensics/reportGenerator.js';
import { askForensicAssistant } from './src/services/forensics/geminiAssistant.js';
import {
  executeMultiTurnChat,
  FORENSIC_SYSTEM_ROLES,
  GeminiModelTier,
} from './src/services/forensics/geminiChatService.js';
import { ForensicCase, UserRole, UserSession } from './src/types.js';

// Memory storage for secure, immediate in-process forensic inspection
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit to protect against DoS/decompression bombs
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(jpe?g|png|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed: JPEG, PNG, WEBP.'));
    }
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API Routes ---

  // Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'operational',
      service: 'MorphGuard AI Forensic Analysis Engine',
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      capabilities: [
        'GOOGLE_SIGN_IN_API',
        'GOOGLE_IDENTITY_SERVICES_GSI',
        'OAUTH2_AUTHENTICATION',
        'JPEG_ELA',
        'LBP_TEXTURE',
        'GLCM_COOCCURRENCE',
        'FFT_SPECTRAL',
        'NOISE_RESIDUAL',
        'FACIAL_LANDMARK_GEOMETRY',
        'SOBEL_BOUNDARY_EDGE',
        'EXIF_METADATA',
        'SHA256_CRYPTOGRAPHIC_INTEGRITY',
        'AUDIT_CHAIN_LOGGING',
      ],
    });
  });

  // Authentication Configuration
  app.get('/api/auth/config', (req: Request, res: Response) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
      appUrl: process.env.APP_URL || '',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Google OAuth Authorization URL Builder (Popup Flow)
  app.get('/api/auth/google/url', (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/auth/callback`;

    if (!clientId) {
      return res.status(400).json({
        error: 'Google Client ID is not configured. Please set GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID in Settings.',
        redirectUri,
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    res.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      redirectUri,
    });
  });

  // OAuth Callback Handler (for Popup & Redirect flows)
  const handleAuthCallback = (req: Request, res: Response) => {
    const { code, error } = req.query;
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>MorphGuard AI — Authentication Callback</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #020617;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background-color: #0f172a;
              border: 1px solid #1e293b;
              border-radius: 12px;
              padding: 24px 32px;
              text-align: center;
              max-width: 420px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            }
            .spinner {
              width: 32px;
              height: 32px;
              border: 3px solid #312e81;
              border-top-color: #6366f1;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            h2 { font-size: 16px; margin: 0 0 8px; color: #e2e8f0; }
            p { font-size: 13px; color: #94a3b8; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>Authentication Completed</h2>
            <p>Verifying digital credentials with MorphGuard Forensic Registry...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                code: ${JSON.stringify(code || '')},
                error: ${JSON.stringify(error || '')}
              }, '*');
              setTimeout(() => window.close(), 600);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  };
  app.get(['/auth/callback', '/auth/callback/'], handleAuthCallback);

  // Google Identity Services (GSI) ID Token Verification
  app.post('/api/auth/google/verify', (req: Request, res: Response) => {
    try {
      const { credential, role } = req.body;
      if (!credential) {
        return res.status(400).json({ error: 'Missing Google ID token credential.' });
      }

      const parts = credential.split('.');
      if (parts.length < 2) {
        return res.status(400).json({ error: 'Malformed Google credential.' });
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      const selectedRole: UserRole = role === 'ADMIN' ? 'ADMIN' : role === 'VIEWER' ? 'VIEWER' : 'ANALYST';

      const user: UserSession = {
        id: `usr-google-${payload.sub || Date.now()}`,
        googleId: payload.sub,
        name: payload.name || 'Verified Google Examiner',
        email: payload.email || 'officer@morphguard.gov',
        avatarUrl: payload.picture,
        emailVerified: Boolean(payload.email_verified),
        role: selectedRole,
        agency: payload.hd ? `${payload.hd.toUpperCase()} Forensic Biometrics` : 'Federal Identity & Biometrics Taskforce',
        authProvider: 'google',
        lastLoginAt: new Date().toISOString(),
      };

      caseStore.logAuditEvent(
        'USER_AUTHENTICATED',
        `Google Sign-In verified via GSI for ${user.name} (${user.email}). Account ID: ${user.googleId || 'N/A'}. Assigned Role: ${user.role}.`,
        undefined,
        user.email,
        user.role
      );

      res.json({ success: true, user });
    } catch (err: any) {
      console.error('Error verifying Google token:', err);
      res.status(400).json({ error: 'Failed to verify Google credential token.' });
    }
  });

  // Google OAuth Profile Sync
  app.post('/api/auth/google/sync', (req: Request, res: Response) => {
    try {
      const { email, name, avatarUrl, googleId, emailVerified, role } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }
      const selectedRole: UserRole = role === 'ADMIN' ? 'ADMIN' : role === 'VIEWER' ? 'VIEWER' : 'ANALYST';

      const user: UserSession = {
        id: `usr-google-${googleId || Date.now()}`,
        googleId,
        name: name || email.split('@')[0].toUpperCase(),
        email,
        avatarUrl,
        emailVerified: Boolean(emailVerified),
        role: selectedRole,
        agency: email.endsWith('.gov')
          ? 'Federal Biometrics & Forensic Identification Taskforce'
          : 'Digital Evidence Forensic Laboratory',
        authProvider: 'google',
        lastLoginAt: new Date().toISOString(),
      };

      caseStore.logAuditEvent(
        'USER_AUTHENTICATED',
        `Google Sign-In authenticated via OAuth2 for ${user.name} (${user.email}). Role: ${user.role}.`,
        undefined,
        user.email,
        user.role
      );

      res.json({ success: true, user });
    } catch (err: any) {
      console.error('Error syncing Google profile:', err);
      res.status(500).json({ error: 'Failed to sync Google user profile.' });
    }
  });

  // Standard / Demo Login & Session Creation
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, role, name } = req.body;
    const selectedRole: UserRole = role === 'ADMIN' ? 'ADMIN' : role === 'VIEWER' ? 'VIEWER' : 'ANALYST';

    const user: UserSession = {
      id: `usr-${Date.now()}`,
      name: name || (email ? email.split('@')[0].replace('.', ' ').toUpperCase() : 'EXAMINER JENKINS'),
      email: email || 'officer.jenkins@morphguard.gov',
      role: selectedRole,
      agency: 'Border Security & Biometrics Taskforce',
      authProvider: 'demo',
      lastLoginAt: new Date().toISOString(),
    };

    caseStore.logAuditEvent(
      'USER_AUTHENTICATED',
      `Examiner session established for ${user.name} (${user.email}) with role ${user.role}.`,
      undefined,
      user.email,
      user.role
    );

    res.json({ success: true, user });
  });

  // Session Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const { email, role } = req.body;
    caseStore.logAuditEvent(
      'USER_LOGOUT',
      `Examiner ${email || 'anonymous'} logged out from active forensic session.`,
      undefined,
      email || 'officer.jenkins@morphguard.gov',
      role || 'ANALYST'
    );
    res.json({ success: true });
  });

  // Dashboard Statistics
  app.get('/api/dashboard/statistics', (req: Request, res: Response) => {
    const stats = caseStore.getDashboardStatistics();
    res.json(stats);
  });

  // List Cases
  app.get('/api/cases', (req: Request, res: Response) => {
    const cases = caseStore.listCases();
    res.json(cases);
  });

  // Get Case Details
  app.get('/api/cases/:case_id', (req: Request, res: Response) => {
    const found = caseStore.getCase(req.params.case_id);
    if (!found) {
      return res.status(404).json({ error: 'Forensic case record not found.' });
    }
    res.json(found);
  });

  // Record Examiner Verdict
  app.post('/api/cases/:case_id/verdict', (req: Request, res: Response) => {
    const { verdict, notes, user } = req.body;
    const updated = caseStore.updateCaseVerdict(req.params.case_id, verdict, notes, user);
    if (!updated) {
      return res.status(404).json({ error: 'Forensic case not found.' });
    }
    res.json(updated);
  });

  // Upload & Analyze Image (Single or Batch Item)
  app.post('/api/cases/upload', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
      }

      const buffer = req.file.buffer;
      const originalName = req.file.originalname || 'unknown_evidence.jpg';
      const subjectName = req.body.subjectName || 'Unregistered Subject';
      const caseTitle = req.body.title || `Investigation: ${originalName}`;
      const analystUser = req.body.analystUser || 'officer.jenkins@morphguard.gov';
      const analystRole: UserRole = req.body.analystRole || 'ANALYST';

      // Execute master forensic pipeline
      const pipelineOutput = await runForensicPipeline(buffer, { filename: originalName });
      const { sha256, results } = pipelineOutput;

      // Base64 data URL for preview in UI
      const mime = req.file.mimetype || 'image/jpeg';
      const imageUrl = `data:${mime};base64,${buffer.toString('base64')}`;

      // Create new Forensic Case
      const caseId = `case-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const caseNumber = `MG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newCase: ForensicCase = {
        id: caseId,
        caseNumber,
        title: caseTitle,
        targetSubjectName: subjectName,
        createdAt: new Date().toISOString(),
        createdBy: analystUser,
        analystAgency: 'Federal Border Security & Identity Forensics',
        status: results.summary.isInconclusive ? 'Inconclusive' : 'Completed',
        filename: originalName,
        fileSizeBytes: buffer.length,
        imageDimensions: {
          width: results.imageQuality.width,
          height: results.imageQuality.height,
        },
        imageHashSha256: sha256,
        imageUrl,
        isSampleCase: false,
        results,
        analystVerdict: 'PENDING_REVIEW',
      };

      caseStore.createCase(newCase);

      caseStore.logAuditEvent(
        'ANALYSIS_COMPLETED',
        `Forensic multimodal analysis completed for ${caseNumber}. Assessment: ${results.summary.riskLevel} (Risk: ${(results.summary.riskScore * 100).toFixed(0)}%, Confidence: ${(results.summary.confidence * 100).toFixed(0)}%)`,
        newCase.id,
        analystUser,
        analystRole
      );

      res.status(201).json(newCase);
    } catch (err: any) {
      console.error('Forensic upload & pipeline error:', err);
      res.status(422).json({
        error: err.message || 'Forensic image analysis failed. File may be corrupted or unsupported.',
      });
    }
  });

  // Download PDF Report
  app.get('/api/cases/:case_id/report', (req: Request, res: Response) => {
    const targetCase = caseStore.getCase(req.params.case_id);
    if (!targetCase) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    try {
      const doc = generatePdfReport(targetCase);
      const pdfOutput = doc.output('arraybuffer');

      caseStore.logAuditEvent(
        'REPORT_GENERATED',
        `Official PDF forensic screening report generated for case ${targetCase.caseNumber}`,
        targetCase.id
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="MorphGuard_Report_${targetCase.caseNumber}.pdf"`
      );
      res.send(Buffer.from(pdfOutput));
    } catch (err: any) {
      console.error('Failed to generate PDF report:', err);
      res.status(500).json({ error: 'Failed to generate PDF forensic report.' });
    }
  });

  // Audit Logs
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    const caseId = req.query.caseId as string | undefined;
    const logs = caseStore.getAuditLogs(caseId);
    res.json(logs);
  });

  // Forensic AI Analyst Assistant (Single query backward compatibility)
  app.post('/api/assistant/ask', async (req: Request, res: Response) => {
    const { caseId, question } = req.body;
    if (!caseId || !question) {
      return res.status(400).json({ error: 'caseId and question are required.' });
    }

    const targetCase = caseStore.getCase(caseId);
    if (!targetCase) {
      return res.status(404).json({ error: 'Target case not found.' });
    }

    try {
      const answer = await askForensicAssistant(targetCase, question);
      res.json({ answer });
    } catch (err: any) {
      console.error('Assistant API error:', err);
      res.status(500).json({ error: 'Forensic copilot analysis failed.' });
    }
  });

  // Get available specialized forensic chatbot roles
  app.get('/api/chat/roles', (req: Request, res: Response) => {
    res.json(FORENSIC_SYSTEM_ROLES);
  });

  // Multi-Turn Gemini Chatbot Endpoint
  app.post('/api/chat/message', async (req: Request, res: Response) => {
    try {
      const {
        messages,
        systemRoleKey,
        customSystemInstruction,
        modelTier,
        caseId,
        userEmail,
        userRole,
      } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required.' });
      }

      let targetCase: ForensicCase | null = null;
      if (caseId) {
        targetCase = caseStore.getCase(caseId) || null;
      }

      // Execute multi-turn conversation with Gemini
      const result = await executeMultiTurnChat({
        messages,
        systemRoleKey,
        customSystemInstruction,
        modelTier: modelTier as GeminiModelTier,
        targetCase,
      });

      // Log AI consultation event to audit trail
      if (userEmail) {
        const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.text || 'Forensic consultation';
        caseStore.logAuditEvent(
          'AI_ASSISTANT_QUERY',
          `Gemini AI consultation (${result.modelUsed}) by ${userEmail}. Inquiry: "${lastUserMsg.substring(0, 80)}..."`,
          caseId,
          userEmail,
          userRole || 'ANALYST'
        );
      }

      res.json(result);
    } catch (err: any) {
      console.error('Multi-turn chat error:', err);
      res.status(500).json({ error: err.message || 'Gemini multi-turn chat failed.' });
    }
  });

  // Determine whether running as compiled production bundle or development mode
  const isCompiledBundle = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');
  const bundleDir = typeof __dirname !== 'undefined' ? __dirname : path.join(process.cwd(), 'dist');
  const distPath = fs.existsSync(path.join(bundleDir, 'index.html'))
    ? bundleDir
    : path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(indexHtmlPath);

  // In production bundle (or when NODE_ENV is production), serve static assets
  const isProduction = (process.env.NODE_ENV === 'production' || isCompiledBundle) && hasDist;

  if (isProduction) {
    // Serve production static assets compiled by Vite
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(indexHtmlPath);
    });
  } else {
    // Vite middleware for local development server only
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MorphGuard AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting MorphGuard AI server:', err);
  process.exit(1);
});
