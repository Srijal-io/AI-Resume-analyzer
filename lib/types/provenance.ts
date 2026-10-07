import { z } from 'zod';

/**
 * Resurox V2 Provenance State Machine
 * Defines the strict, tamper-proof origin of candidate qualifications and evidence.
 */

export const ProvenanceStateSchema = z.enum([
  'RESUME_EVIDENCE',    // Present directly in the uploaded resume
  'USER_CONFIRMED_T1',  // Attested by user with level & context (Skills section only)
  'USER_CONFIRMED_T2',  // Attested by user with concrete description (Skills + linked bullet)
  'USER_PROVIDED_ENTRY',// New project or role provided by user (labelled in report)
  'AI_INFERRED',        // Guessed by AI (CANNOT enter output documents)
  'JD_ONLY',            // Present in JD only (CANNOT enter output documents)
  'REJECTED',           // Explicitly rejected by user (NEVER enters output)
  'CONFLICT',           // Disagreeing evidence sources (Blocked until resolved)
]);

export type ProvenanceState = z.infer<typeof ProvenanceStateSchema>;

export interface BaseConfirmedSkill {
  skill: string;
  level: 'Used' | 'Comfortable' | 'Familiar';
  context: string;
  confirmedAt: string;
}

export interface ConfirmedSkillT1 extends BaseConfirmedSkill {
  provenance: 'USER_CONFIRMED_T1';
}

export interface ConfirmedSkillT2 extends BaseConfirmedSkill {
  description: string;
  linkedBulletId?: string;
  provenance: 'USER_CONFIRMED_T2';
}

/**
 * Validates whether a given provenance state allows entry into output documents.
 */
export function canEnterOutput(provenance: ProvenanceState): boolean {
  switch (provenance) {
    case 'RESUME_EVIDENCE':
    case 'USER_CONFIRMED_T1':
    case 'USER_CONFIRMED_T2':
    case 'USER_PROVIDED_ENTRY':
      return true;
    case 'AI_INFERRED':
    case 'JD_ONLY':
    case 'REJECTED':
    case 'CONFLICT':
    default:
      return false;
  }
}

/**
 * Provenance transition rules. Only deterministic code can drive transitions.
 */
export function transitionProvenance(
  current: ProvenanceState,
  action: 'USER_CONFIRM_T1' | 'USER_CONFIRM_T2' | 'USER_REJECT' | 'RESOLVE_CONFLICT'
): ProvenanceState {
  if (action === 'USER_REJECT') {
    return 'REJECTED';
  }
  if (action === 'USER_CONFIRM_T1') {
    if (current === 'JD_ONLY' || current === 'AI_INFERRED' || current === 'CONFLICT') {
      return 'USER_CONFIRMED_T1';
    }
  }
  if (action === 'USER_CONFIRM_T2') {
    if (current === 'JD_ONLY' || current === 'AI_INFERRED' || current === 'CONFLICT') {
      return 'USER_CONFIRMED_T2';
    }
  }
  if (action === 'RESOLVE_CONFLICT') {
    return 'RESUME_EVIDENCE';
  }
  return current;
}
