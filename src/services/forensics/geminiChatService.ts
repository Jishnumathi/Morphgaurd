/**
 * MorphGuard AI — Server-Side Multi-Turn Gemini Chat Service
 * Supports multi-turn conversation history, dynamic model selection:
 * - gemini-3.8-flash (General forensic tasks)
 * - gemini-3.1-flash-lite (Fast triage & rapid assessments)
 * - gemini-3.1-pro-preview (Particularly complex mathematical & evidentiary tasks)
 * Role-based system instructions and case evidence grounding.
 */

import { GoogleGenAI } from '@google/genai';
import { ForensicCase } from '../../types.js';

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export type GeminiModelTier = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview';

export interface ChatMessagePayload {
  role: 'user' | 'model' | 'system';
  text: string;
}

export interface ChatRequestOptions {
  messages: ChatMessagePayload[];
  systemRoleKey?: string;
  customSystemInstruction?: string;
  modelTier?: GeminiModelTier;
  targetCase?: ForensicCase | null;
}

// Built-in Expert Forensic Roles for System Instructions
export const FORENSIC_SYSTEM_ROLES: Record<string, { title: string; prompt: string; recommendedModel: GeminiModelTier }> = {
  GENERAL_EXAMINER: {
    title: 'Lead Forensic Screening Examiner',
    recommendedModel: 'gemini-3.8-flash',
    prompt: `You are the Lead Forensic Screening Examiner at MorphGuard AI Border Security & Biometric Identification Taskforce.
Your objective is to provide authoritative, balanced, and scientifically accurate evaluations of digital facial imagery.
Maintain a professional, objective, and consultative tone. Structure your explanations with clear headings, bullet points, and actionable next steps for the investigating officer.`,
  },
  RAPID_TRIAGE: {
    title: 'Rapid Border Triage Specialist',
    recommendedModel: 'gemini-3.1-flash-lite',
    prompt: `You are the Rapid Border Triage Specialist.
Your job is to deliver ultra-fast, high-priority screening summaries.
Be direct, concise, and focused on immediate security risks: is the passport or biometric photo suspicious? What is the quickest sanity check the border officer should perform right now? Keep explanations under 3-4 bullet points.`,
  },
  DEEP_METRIC_SPECIALIST: {
    title: 'Senior Biometrics & Signal Forensics Scientist',
    recommendedModel: 'gemini-3.1-pro-preview',
    prompt: `You are a Senior Biometrics & Signal Forensics Scientist specializing in Error Level Analysis (ELA), 2D Fourier Spectral analysis, sensor noise PRNU/Laplacian residuals, Local Binary Pattern (LBP) entropy, and facial landmark Delaunay triangulation geometry.
Provide exhaustive, technically rigorous explanations with mathematical formulations, error margins, and statistical confidence models.`,
  },
  CHAIN_OF_CUSTODY_AUDITOR: {
    title: 'Court Evidentiary & ISO/IEC 27037 Auditor',
    recommendedModel: 'gemini-3.8-flash',
    prompt: `You are a Digital Evidence & Chain of Custody Auditor adhering strictly to ISO/IEC 27037, ISO/IEC 30107, and Daubert/Federal Rules of Evidence.
Guide the user on admissibility standards, cryptographic hash verification (SHA-256), non-destructive testing methodologies, and preparing courtroom-defensible forensic dossiers.`,
  },
};

/**
 * Execute multi-turn chat with conversation history
 */
export async function executeMultiTurnChat(options: ChatRequestOptions): Promise<{
  reply: string;
  modelUsed: string;
  suggestedFollowUps: string[];
}> {
  const {
    messages,
    systemRoleKey = 'GENERAL_EXAMINER',
    customSystemInstruction,
    modelTier = 'gemini-3.8-flash',
    targetCase,
  } = options;

  // Determine system instruction
  const roleConfig = FORENSIC_SYSTEM_ROLES[systemRoleKey] || FORENSIC_SYSTEM_ROLES.GENERAL_EXAMINER;
  let baseSystemInstruction = customSystemInstruction || roleConfig.prompt;

  // Ground with case evidence if provided
  if (targetCase && targetCase.results) {
    const res = targetCase.results;
    const summary = res.summary;
    baseSystemInstruction += `\n\n=== GROUNDED ACTIVE CASE EVIDENCE ===
Case Number: ${targetCase.caseNumber}
Subject: ${targetCase.targetSubjectName || 'Unknown'}
Evidence SHA-256: ${targetCase.imageHashSha256}
Dimensions: ${targetCase.imageDimensions.width}x${targetCase.imageDimensions.height} px
Risk Assessment: ${summary.riskLevel} (${(summary.riskScore * 100).toFixed(1)}%, Confidence: ${(summary.confidence * 100).toFixed(1)}%)
Inconclusive: ${summary.isInconclusive ? 'YES (' + summary.inconclusiveReason + ')' : 'NO'}
Sensor Noise Inconsistency: ${res.noise ? (res.noise.noiseInconsistencyRatio * 100).toFixed(1) + '%' : 'N/A'}
High-Frequency FFT Energy: ${res.frequency ? (res.frequency.highFreqEnergyRatio * 100).toFixed(1) + '%' : 'N/A'}
Periodic Resampling Artifacts: ${res.frequency?.periodicArtifactDetected ? 'DETECTED' : 'NONE'}
LBP Shannon Entropy: ${res.texture?.lbpEntropy.toFixed(2) || 'N/A'} bits
GLCM Homogeneity: ${res.texture?.glcmHomogeneity.toFixed(3) || 'N/A'}
Boundary Discontinuity: ${res.edge ? (res.edge.boundaryGradientDiscontinuity * 100).toFixed(1) + '%' : 'N/A'}
Compression ELA Inconsistency: ${res.compression ? (res.compression.elaInconsistencyScore * 100).toFixed(1) + '%' : 'N/A'}
Metadata: ${res.metadata?.metadataPresent ? 'Present (' + res.metadata.softwareTag + ')' : 'Stripped'}
Key Indicators: ${summary.primaryIndicators.join('; ')}
=== END GROUNDED CASE EVIDENCE ===
Always tie answers back to these specific forensic readings when relevant.`;
  }

  const ai = getAiClient();

  // If no Gemini API key configured, use intelligent deterministic forensic copilot
  if (!ai) {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.text || '';
    const fallbackReply = generateDeterministicResponse(lastUserMessage, targetCase, roleConfig.title);
    return {
      reply: fallbackReply,
      modelUsed: `${modelTier} (Deterministic Mode)`,
      suggestedFollowUps: [
        'How does JPEG Error Level Analysis (ELA) work?',
        'What causes sensor noise inconsistency in morphed images?',
        'How should this case be logged for ISO/IEC 27037 compliance?',
      ],
    };
  }

  // Build multi-turn contents array conforming to @google/genai SDK
  // Alternating 'user' and 'model' turns
  const contents = messages
    .filter((m) => m.role === 'user' || m.role === 'model')
    .map((m) => ({
      role: m.role as 'user' | 'model',
      parts: [{ text: m.text }],
    }));

  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Initiate forensic consultation.' }],
    });
  }

  // Model selection resolution:
  // Complex tasks -> gemini-3.1-pro-preview
  // General tasks -> gemini-3.8-flash
  // Fast tasks -> gemini-3.1-flash-lite
  const selectedModel = modelTier;

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: baseSystemInstruction,
        temperature: selectedModel === 'gemini-3.1-pro-preview' ? 0.1 : 0.25,
        maxOutputTokens: 1500,
      },
    });

    const reply = response.text || 'No textual response generated by forensic intelligence model.';

    return {
      reply,
      modelUsed: selectedModel,
      suggestedFollowUps: generateSuggestedFollowUps(messages[messages.length - 1]?.text || '', targetCase),
    };
  } catch (err: any) {
    console.error(`Gemini API Error with model ${selectedModel}:`, err);
    // Graceful fallback to gemini-3.8-flash or deterministic response if quota/model access issue
    if (selectedModel !== 'gemini-3.8-flash') {
      try {
        console.warn('Attempting fallback to gemini-3.8-flash...');
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: baseSystemInstruction,
            temperature: 0.25,
          },
        });
        return {
          reply: fallbackRes.text || 'Response received via fallback tier.',
          modelUsed: 'gemini-3.8-flash (Automated Fallback)',
          suggestedFollowUps: generateSuggestedFollowUps(messages[messages.length - 1]?.text || '', targetCase),
        };
      } catch (fallbackErr) {
        console.error('Fallback model also failed:', fallbackErr);
      }
    }

    const lastMsg = messages.filter((m) => m.role === 'user').pop()?.text || '';
    return {
      reply: generateDeterministicResponse(lastMsg, targetCase, roleConfig.title),
      modelUsed: `${selectedModel} (Local Protocol Fallback)`,
      suggestedFollowUps: [
        'Explain the mathematical formula for LBP Entropy',
        'How do 2D FFT spectral harmonics detect GAN upsampling?',
        'Generate an examiner summary for court testimony',
      ],
    };
  }
}

function generateSuggestedFollowUps(lastQuestion: string, targetCase?: ForensicCase | null): string[] {
  const lower = lastQuestion.toLowerCase();
  if (lower.includes('noise')) {
    return [
      'What are the typical PRNU thresholds for genuine smartphone cameras?',
      'How does double JPEG compression alter Laplacian residuals?',
      'Explain the difference between interior facial noise and background noise.',
    ];
  }
  if (lower.includes('ela') || lower.includes('compression')) {
    return [
      'What does a bright white patch in an ELA difference heatmap signify?',
      'Why do uncompressed PNG files show uniform ELA zero-difference?',
      'How does 8x8 DCT grid misalignment reveal cut-and-paste tampering?',
    ];
  }
  if (targetCase) {
    return [
      `How does the ${(targetCase.results.summary.riskScore * 100).toFixed(0)}% risk score translate to border screening action?`,
      'Which specific metric contributed most to this risk determination?',
      'Draft a formal evidentiary note for this case.',
    ];
  }
  return [
    'What are the standard ISO/IEC 30107 Presentation Attack Detection categories?',
    'How do morphing algorithms blend facial landmarks?',
    'What visual artifacts do diffusion and GAN face generators leave behind?',
  ];
}

function generateDeterministicResponse(
  question: string,
  targetCase?: ForensicCase | null,
  roleTitle?: string
): string {
  const q = question.toLowerCase();

  if (targetCase && targetCase.results) {
    const s = targetCase.results.summary;
    const r = targetCase.results;

    if (q.includes('risk') || q.includes('verdict') || q.includes('summary')) {
      return `### Forensic Assessment for Case ${targetCase.caseNumber}
**Investigator Role:** ${roleTitle || 'Forensic Examiner'}

- **Composite Assessment:** **${s.riskLevel}**
- **Computed Risk Score:** **${(s.riskScore * 100).toFixed(1)}%**
- **Statistical Confidence:** **${(s.confidence * 100).toFixed(1)}%**
- **Subject Identifier:** \`${targetCase.targetSubjectName || 'Unregistered'}\`
- **SHA-256 Hash:** \`${targetCase.imageHashSha256.substring(0, 16)}...\`

#### Key Evidentiary Findings:
${s.primaryIndicators.map((ind) => `- ${ind}`).join('\n')}

#### Recommendations:
${
  s.riskScore >= 0.7
    ? '🚨 **High Priority Review:** Immediate secondary biometric inspection recommended. Request physical document re-scan or secondary live fingerprint/iris verification.'
    : s.riskScore >= 0.4
    ? '⚠️ **Moderate Priority:** Flagged for manual comparison against travel manifest and historical identity archives.'
    : '✅ **Nominal:** All primary biometric and physical signal metrics fall within normal single-source camera parameters.'
}`;
    }

    if (q.includes('noise')) {
      return `### Sensor Noise Residual Analysis (Case ${targetCase.caseNumber})
- **Noise Inconsistency Ratio:** ${(r.noise.noiseInconsistencyRatio * 100).toFixed(1)}%
- **Face Interior Noise (StdDev):** ${r.noise.faceInteriorNoiseStdDev.toFixed(3)}
- **Background Noise (StdDev):** ${r.noise.backgroundNoiseStdDev.toFixed(3)}

**Scientific Interpretation:**
Natural unmanipulated digital photographs exhibit uniform Photo-Response Non-Uniformity (PRNU) and photon shot noise throughout the entire sensor frame. When two face photographs from different cameras or lenses are morphed together, the synthesized facial region retains mixed sensor noise, creating a pronounced disparity against the background.`;
    }
  }

  if (q.includes('morph') || q.includes('how')) {
    return `### Morphing Detection Principles in MorphGuard AI
Digital facial morphing combines two or more subjects to create a fraudulent biometric credential accepted by automated passport control (ABC) gates for multiple identities.

MorphGuard analyzes four distinct forensic layers:
1. **Sensor Physics (PRNU & Laplacian Residuals):** Detects splice boundaries and mixed camera sensor noise.
2. **2D Fourier Spectral Decomposition:** Identifies frequency decay anomalies caused by bilinear/bicubic resampling during landmark warping.
3. **Micro-Texture Entropies (LBP & GLCM):** Identifies synthetic skin smoothing where fine pores and hair textures have been averaged out.
4. **Error Level Analysis (ELA):** Detects inconsistent JPEG compression error states when parts of an image are re-saved.`;
  }

  return `### MorphGuard Forensic AI Intelligence
**Active Role:** ${roleTitle || 'Forensic Specialist'}

I am ready to assist your forensic biometric investigation. You can ask me to:
- Deeply explain any of the multimodal metric heatmaps (ELA, FFT, Noise, Edge, Texture).
- Analyze whether an active case exhibits markers of facial landmark morphing.
- Provide ISO/IEC 27037 chain of custody compliance recommendations.
- Draft technical explanations for official court dossiers.`;
}
