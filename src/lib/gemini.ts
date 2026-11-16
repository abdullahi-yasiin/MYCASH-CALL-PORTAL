import { CustomerRecord, BranchInfo, User } from '../types';

export interface BilingualQuote {
  original: string;
  english: string;
  language: 'Af-Soomaali' | 'English' | 'Mixed';
}

export interface AiComplaintItem {
  issue: string; // Issue title in English (e.g., "High Transaction & Transfer Fees")
  category: string; // e.g., Pricing & Tariffs, Network & SMS Delays, Dialer Governance & Lead Fatigue
  count: number;
  percentage: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedBranches: string[]; // Branches where these complaints originate
  customerQuotes: string[]; // Formatted bilingual strings for PDF & legacy views
  bilingualQuotes?: BilingualQuote[]; // Structured verbatim + English translation pairs
  rootCause: string;
  actionRecommendation: string;
}

export interface AiAppreciationItem {
  theme: string; // Positive / Yes decision theme in English
  count: number;
  percentage: number;
  customerQuotes: string[];
  bilingualQuotes?: BilingualQuote[];
  keyDriver: string;
  convertingBranches?: string[];
}

export interface AiRejectionItem {
  reason: string; // Why customers declined / hesitated / remained dormant in English
  count: number;
  percentage: number;
  customerQuotes: string[];
  bilingualQuotes?: BilingualQuote[];
  customerExplanation: string;
  overcomingScript: string; // Actionable script for agents in English to overcome this objection
  affectedBranches?: string[];
}

export interface AiAppointmentDetail {
  customerName: string;
  phoneNumber?: string;
  agentName: string;
  branch: string;
  appointmentTime: string;
  feedbackNote: string;
  bilingualNote?: BilingualQuote;
  status: string;
}

export interface AiAppointmentInsight {
  totalAppointments: number;
  appointmentRate: number;
  keyObservations: string;
  actionableFollowupAdvice: string;
  sampleAppointments?: AiAppointmentDetail[];
}

export interface AiBranchPerformanceItem {
  branchName: string;
  totalLeads: number;
  callsMade: number;
  conversions: number;
  successRate: number;
  dominantComplaint: string;
  strengths: string;
  bottlenecks: string;
  managerialAdvice: string;
}

export interface AiAgentPerformanceItem {
  agentName: string;
  branch: string;
  totalAssigned: number;
  callsMade: number;
  conversions: number;
  rejections: number;
  conversionRate: number;
  customerSentimentSummary: string;
  tailoredCoachingAdvice: string;
}

export interface AiStrategicObservation {
  title: string;
  priority: 'IMMEDIATE' | 'STRATEGIC' | 'OPERATIONAL';
  description: string;
  expectedImpact: string;
}

export interface AiDecisionSummary {
  yesCount: number; // Verified Success (<30d dormant) + Positive/Agreed-to-use notes
  verifiedSuccessCount: number; // Status === 'Success'
  agreedInProgressCount: number; // Positive commitment notes currently in In-progress
  noCount: number; // Rejected status + Spoken customer objections/barriers
  callbackCount: number; // Scheduled callbacks / appointments
  unreachableCount: number; // Phone off / unanswered call logs
  uncalledCount: number; // Not yet dialed
  yesPercentOfDecided: number;
  noPercentOfDecided: number;
}

export interface AiAnalysisResult {
  reportTitle: string;
  generatedAt: string;
  datePeriod?: string;
  language: 'english';
  executiveSummary: string;
  totalRecordsAnalyzed: number;
  branchesCovered: string[];
  agentsCovered: string[];
  engineUsed?: string;
  aiEngineStatus?: 'connected' | 'fallback';
  statusMessage?: string;
  decisionSummary?: AiDecisionSummary;
  noteTranslations?: Record<string, BilingualQuote>;
  feedbackBreakdown: {
    complaintsPercent: number;
    appreciationsPercent: number;
    rejectionsPercent: number;
    inquiriesAndFollowupsPercent: number;
  };
  sentimentBreakdown: {
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
  };
  topComplaints: AiComplaintItem[];
  topAppreciations: AiAppreciationItem[];
  rejectionAnalysis: AiRejectionItem[];
  appointmentInsights: AiAppointmentInsight;
  branchPerformances: AiBranchPerformanceItem[];
  agentSummaries: AiAgentPerformanceItem[];
  strategicOvercomeAdvices: AiStrategicObservation[];
}

// ============================================================================
// LINGUISTIC HELPERS: SOMALI DETECTION, NEGATION AWARENESS & TRANSLATION
// ============================================================================

const SOMALI_MARKERS_REGEX =
  /\b(waan|waa|wuu|way|waxaan|waxay|wuxuu|waxaa|ayaa|ayuu|aysan|maaha|maahan|malaha|macmiil|macmiilka|macmiilku|akoon|akoonka|lacag|lacagta|adeeg|adeega|adeegga|hadda|berri|bari|galabta|subaxda|caawa|mashquul|mahad|mahadsanid|fiican|wanaagsan|diiday|diidey|diidmo|qaban|qabtay|dansan|damisan|xiran|xirmay|wacay|soo|ballan|balan|ballanta|isticmaal|isticmaalaa|isticmaalayaa|isticmaali|shuban|shubtay|kharash|khidmad|qiimo|qaali|cilad|cillad|fariin|dhicin|qof|kale|dibadda|safar|miyi|baadiye|ilaaway|iloobay|ogolaaday|aqbalay|haye|maya|jawaab|lambarka|nambarka|telefoon|telefoonka|sim|kaarka|aqoonsi|baasaboor|warqad|zaad|sahal|edahab|hormuud|telesom|golis|dhowr|jeer|marar|badan|cabanayaa|cabasho|dhib|dhibsaday|insha|inshallah|rabaa|rabo|doonayo|doonaa|haysto|hayo|awoodo|furay|furtay|xaday|lumay|dhintay|geeriyooday)\b/i;

const ENGLISH_MARKERS_REGEX =
  /\b(customer|client|called|will|promised|agreed|account|phone|switched|busy|later|tomorrow|already|using|declined|refused|not|interested|deposit|active|dormant|forgot|reset|number|wrong|answer|unreachable|unavailable|callback|scheduled|happy|satisfied|complained|fees|charges|network|limit|limits|traveling|abroad|deceased|working|wallet|service|transact|transaction|transactions|activate|reactivate|visit|branch)\b/i;

/**
 * Accurately detects whether a feedback note is written in Af-Soomaali, English, or Mixed Somali/English.
 */
export function detectNoteLanguage(text: string): 'Af-Soomaali' | 'English' | 'Mixed' {
  const clean = (text || '').trim();
  if (!clean) return 'English';

  const somaliMatches = clean.match(new RegExp(SOMALI_MARKERS_REGEX.source, 'gi')) || [];
  const englishMatches = clean.match(new RegExp(ENGLISH_MARKERS_REGEX.source, 'gi')) || [];

  if (somaliMatches.length > 0 && englishMatches.length >= 2) {
    return 'Mixed';
  }
  if (somaliMatches.length > 0) {
    return 'Af-Soomaali';
  }
  if (englishMatches.length > 0) {
    return 'English';
  }

  // Fallback morphological check for Somali double vowels (aa, ee, ii, oo, uu) + common suffixes
  if (/(aa|ee|ii|oo|uu)/i.test(clean) && /\b(ka|ta|ga|da|ha|ba|na|ku|kaas|aas)\b/i.test(clean)) {
    return 'Af-Soomaali';
  }
  return 'English';
}

/**
 * Checks whether a Somali/English note contains negation or refusal markers.
 */
function hasSomaliOrEnglishNegation(lower: string): boolean {
  return /\b(ma|uma|kama|kuma|lama|aan|maya|diiday|diidey|diidan|diidmo|maaha|maahan|malaha|waayay|waayey|la'aan|la aan|joojiyay|jooji|ha\s+i|ha\s+ii|not|no|never|dont|don't|cannot|can't|won't|refused|declined|unable|unwilling|stop)\b/i.test(
    lower
  );
}

/**
 * Checks if a record's feedback note is purely an unanswered / unreachable phone call log
 * rather than a spoken customer opinion, appreciation, or product objection.
 */
export function isUnreachableCallLogNote(noteRaw?: string | null): boolean {
  if (!noteRaw) return false;
  const lower = noteRaw.trim().toLowerCase();
  if (!lower) return false;

  const unreachablePatterns = [
    /\b(qaban\s*waayay|qaban\s*waayey|ma\s*qabanayo|ma\s*qaban|kama\s*jawaabin|jawaab\s*ma\s*leh|la\s*qaban\s*waayay)\b/i,
    /\b(dansan|damisan|xiran\s*yahay|telefoonka\s*waa\s*xiran|telka\s*waa\s*dansan|line-?ka\s*waa\s*xiran|muraad\s*kama\s*jawaabo)\b/i,
    /\b(no\s*answer|not\s*answering|didn't\s*answer|did\s*not\s*answer|unanswered|switched\s*off|phone\s*off|turned\s*off|unreachable|out\s*of\s*coverage|out\s*of\s*service|voicemail)\b/i,
  ];

  // Ensure the note doesn't ALSO contain substantive spoken feedback
  const hasSpokenSubstance =
    /\b(yiri|sheegay|codsaday|ballan|ogolaaday|diiday|kharash|zaad|evc|sahal|pin|said|promised|requested|complained|agreed)\b/i.test(
      lower
    );

  return !hasSpokenSubstance && unreachablePatterns.some(rx => rx.test(lower));
}

/**
 * Check if a customer record has an appointment or callback scheduled.
 * Inspects appointment field, call status, and Somali/English feedback notes (with word boundaries).
 */
export function isAppointmentRecord(r: CustomerRecord): boolean {
  if (r.appointment && r.appointment.trim().length > 0) {
    const val = r.appointment.trim().toLowerCase();
    if (val !== 'none' && val !== 'no' && val !== 'n/a' && val !== '-' && val !== 'null' && val !== 'uncalled') {
      return true;
    }
  }
  const statusLower = (r.status || '').toLowerCase();
  if (/\b(callback|call\s*back|appointment|ballan|balan|dib\s*u\s*wac|wacitaan\s*dambe)\b/i.test(statusLower)) {
    return true;
  }
  const noteLower = (r.feedbackNote || '').toLowerCase();
  return /\b(ballan|balan|ballanta|callback|call\s*back|dib\s*u\s*wac|dib\s*ii\s*soo\s*wac|dib\s*u\s*soo\s*wac|soo\s*wac\s*berri|soo\s*wac\s*galabta|appointment|wacitaan\s*dambe|wicitaan\s*dambe|follow\s*up|follow-up|call\s*me\s*back|call\s*later|call\s*tomorrow)\b/i.test(
    noteLower
  );
}

/**
 * Check if a customer feedback note describes repeated calling or excessive follow-up complaints.
 */
export function isRepeatedCallComplaintRecord(r: CustomerRecord): boolean {
  const note = (r.feedbackNote || '').toLowerCase().trim();
  if (!note || note.length < 3) return false;

  const repeatedRx =
    /\b(marar\s*badan|dhowr\s*jeer|dhowrjeer|dhowr\s*goor|soo\s*celceliyay|soo\s*celcelis|soo\s*noqnoqday|badan\s*baa\s*la\s*wacay|wacitaan\s*badan|wacid\s*badan|ha\s*ii?\s*soo\s*wicin|ha\s*la\s*iga\s*daayo|waad\s*i\s*dhibteen|waan\s*dhibsaday|several\s*times|multiple\s*times|repeated\s*calls?|called\s*several\s*times|called\s*multiple\s*times|too\s*many\s*calls|already\s*called\s*me|stop\s*calling|over-?called)\b/i;

  if (repeatedRx.test(note)) return true;

  const hasComplaintWord = /\b(cabasho|cabanayaa|cabanaysa|cabanaya|xanaaq|xanaaqsan|dhibsaday|dhibsadey|complaining|irritated|annoyed)\b/i.test(note);
  const hasCallWord = /\b(wacitaanka|wacitaan|la\s*soo\s*wacay|calling|calls)\b/i.test(note);
  return hasComplaintWord && hasCallWord;
}

/**
 * Helper to match records to agents, accounting for full names, partial names, and "Agent X" prefixes.
 */
export function isRecordAssignedToAgent(r: CustomerRecord, ag: User): boolean {
  if (r.assignedAgentId && ag.id && r.assignedAgentId === ag.id) {
    return true;
  }
  if (!r.assignedAgentName) return false;
  const recName = r.assignedAgentName.trim().toLowerCase();
  const agName = ag.name.trim().toLowerCase();

  if (recName === agName) return true;
  if (recName.includes(agName) || agName.includes(recName)) return true;

  const cleanRec = recName.replace(/^agent\s+/i, '').trim();
  const cleanAg = agName.replace(/^agent\s+/i, '').trim();
  if (cleanRec === cleanAg || cleanRec.includes(cleanAg) || cleanAg.includes(cleanRec)) return true;

  return false;
}

/**
 * Normalizes branch names by trimming, converting to lower case, and removing common suffixes like "branch", "hub", "office".
 */
export function normalizeBranchName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*(branch|region|hub|office|team)$/i, '')
    .replace(/^(branch|region)\s*/i, '')
    .trim();
}

/**
 * Robust helper to match a CustomerRecord to a BranchInfo.
 */
export function isRecordInBranch(
  r: CustomerRecord,
  branch: BranchInfo | string,
  branchAgents?: User[]
): boolean {
  if (!r) return false;
  const branchName = typeof branch === 'string' ? branch : branch.name;
  const branchRegion = typeof branch === 'object' && branch ? branch.region : '';

  const recArea = (r.areaOfReg || '').trim();
  const bNorm = normalizeBranchName(branchName);
  const rNorm = normalizeBranchName(recArea);

  if (recArea && branchName) {
    if (recArea.toLowerCase() === branchName.toLowerCase()) return true;
    if (rNorm && bNorm && rNorm === bNorm) return true;

    const bClean = branchName.toLowerCase().replace(/branch|hub|office|central|[_-\s]+/gi, '').trim();
    const rClean = recArea.toLowerCase().replace(/branch|hub|office|central|[_-\s]+/gi, '').trim();
    if (bClean && rClean && bClean === rClean) return true;
  }

  if (recArea && branchRegion) {
    const regNorm = normalizeBranchName(branchRegion);
    if (rNorm && regNorm && rNorm === regNorm) return true;
  }

  if ((!recArea || recArea.toLowerCase() === 'unassigned') && branchAgents && branchAgents.length > 0) {
    const matchedAgent = branchAgents.find(ag => isRecordAssignedToAgent(r, ag));
    if (matchedAgent && matchedAgent.branch) {
      const agBranchNorm = normalizeBranchName(matchedAgent.branch);
      if (agBranchNorm && bNorm && agBranchNorm === bNorm) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts contextual details (timeframe, competitor name, amount) from a Somali note so translations preserve exact details.
 */
function extractSomaliTimeHint(lower: string): string {
  if (/\b(berri|bari)\b/i.test(lower)) return ' tomorrow';
  if (/\b(galabta|galabtii)\b/i.test(lower)) return ' this afternoon';
  if (/\b(caawa|habeenkii)\b/i.test(lower)) return ' this evening';
  if (/\b(subaxda|subaxdii)\b/i.test(lower)) return ' in the morning';
  if (/\bisniin(ta)?\b/i.test(lower)) return ' on Monday';
  if (/\btalaada(da)?\b/i.test(lower)) return ' on Tuesday';
  if (/\barbaca(da)?\b/i.test(lower)) return ' on Wednesday';
  if (/\bkhamiis(ta)?\b/i.test(lower)) return ' on Thursday';
  if (/\bjimca(ha)?\b/i.test(lower)) return ' on Friday';
  if (/\bsabti(da)?\b/i.test(lower)) return ' on Saturday';
  if (/\baxad(da|a)?\b/i.test(lower)) return ' on Sunday';
  if (/\b(isbuuca\s*dambe|todobaadka\s*dambe|usbuuca\s*dambe)\b/i.test(lower)) return ' next week';
  if (/\b(bisha\s*dambe|dhamaadka\s*bisha|mushaharka)\b/i.test(lower)) return ' at month-end / payday';
  return '';
}

function extractCompetitorMentions(lower: string): string {
  const found: string[] = [];
  if (/\bevc(\s*plus)?\b/i.test(lower) || /\bhormuud\b/i.test(lower)) found.push('EVC Plus');
  if (/\bzaad\b/i.test(lower) || /\btelesom\b/i.test(lower)) found.push('Zaad');
  if (/\bsahal\b/i.test(lower) || /\bgolis\b/i.test(lower)) found.push('Sahal');
  if (/\be-?dahab\b/i.test(lower)) found.push('e-Dahab');
  if (/\bpremier\b/i.test(lower)) found.push('Premier Wallet');
  if (/\bsalaam\b/i.test(lower)) found.push('Salaam Bank');
  return found.length > 0 ? found.join(' / ') : 'an alternative mobile money wallet';
}

/**
 * Context-aware, multi-clause Af-Soomaali to English translator for customer feedback notes.
 * Uses strict word boundaries (\b) and Somali negation detection so words like "mahadsanid" or "diiday"
 * NEVER collide with short English substrings like "id" or "ok".
 */
export function translateSomaliQuoteToEnglish(rawQuote: string): string {
  if (!rawQuote || rawQuote.trim().length === 0) return '';
  const clean = rawQuote.trim().replace(/^["']+|["']+$/g, '').trim();
  if (!clean) return '';

  const lang = detectNoteLanguage(clean);
  if (lang === 'English') {
    // Already written in English by the agent — return clean capitalized English verbatim!
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  const lower = clean.toLowerCase();
  const negated = hasSomaliOrEnglishNegation(lower);
  const timeHint = extractSomaliTimeHint(lower);
  const clauses: string[] = [];

  // 1. Repeated calls / over-dialing complaint
  if (
    /\b(marar\s*badan|dhowr\s*jeer|dhowrjeer|dhowr\s*goor|ha\s*ii?\s*soo\s*wicin|ha\s*la\s*iga\s*daayo|ha\s*i\s*wareerin|ha\s*i\s*dhibin|dhibsaday|dhibsadey|wacitaan\s*badan|wacid\s*badan|soo\s*celcelis|soo\s*noqnoqday)\b/i.test(
      lower
    )
  ) {
    clauses.push('Customer complained about receiving repeated calls and asked not to be called repeatedly');
  }

  // 2. Wrong phone number / SIM belongs to someone else
  if (
    /\b(qof\s*kale|ima\s*laha|ma\s*laha|nambar\s*qaldan|number\s*qaldan|lambar\s*khalad|number\s*khalad|waa\s*khalad|waa\s*qalad|ima\s*quseyso|aniga\s*ma\s*ihi|qofkaas\s*ma\s*ihi)\b/i.test(
      lower
    )
  ) {
    clauses.push('Wrong number reached — this phone number now belongs to a different person');
  }

  // 3. Deceased or living/traveling abroad or rural area
  if (/\b(dhintay|geeriyooday|allaha\s*u\s*naxariisto)\b/i.test(lower)) {
    clauses.push('The registered account holder has passed away');
  }
  if (/\b(dibadda|dibedda|dalka\s*ma\s*joogo|safar|dal\s*kale)\b/i.test(lower)) {
    clauses.push('Customer is currently traveling or residing abroad');
  }
  if (/\b(miyi|baadiye|tuulo|internet\s*ma\s*leh|internet\s*malaha|smartphone\s*ma|telefoon\s*yar|toosh)\b/i.test(lower)) {
    clauses.push('Customer is in a rural area or using a basic handset without internet/app access');
  }

  // 4. SIM card lost, stolen, or changed
  if (/\b(sim-?ka|simcard|kaarka)\b/i.test(lower) && /\b(lumay|xaday|jabtay|bedelay|iga\s*xirmay|ma\s*hayo)\b/i.test(lower)) {
    clauses.push('Customer lost or changed their registered SIM card and needs number update assistance');
  }

  // 5. Forgot PIN / Password / App locked or technical login barrier
  if (/\b(pin-?ka|pin|password|furaha|sirta|login|app-?ka|application)\b/i.test(lower)) {
    if (/\b(ilaaway|iloobay|xasuusan|forgot)\b/i.test(lower)) {
      clauses.push('Customer forgot their account PIN/password and needs a PIN reset to transact');
    } else if (/\b(xirmay|xiran|block|furmi\s*waayay|shaqayn\s*waayay|cilad)\b/i.test(lower)) {
      clauses.push('Customer reported their mobile app or account is locked/not opening and needs technical support');
    } else if (/\b(caawimaad|fahmin|sidii\s*loo\s*isticmaalo)\b/i.test(lower)) {
      clauses.push('Customer needs guidance on how to use the MyCash app');
    }
  }

  // 6. Transaction fees / tariff complaint (strictly fee words, NOT generic 'lacag'!)
  if (
    /\b(kharash|kharashka|qaali|lacag\s*jaris|laga\s*jarayo|commission|khidmad|khidmadda|cashuur|tacriifad)\b/i.test(lower)
  ) {
    clauses.push('Customer raised concern that transaction or transfer fees are too high');
  }

  // 7. Network / SMS OTP delay
  if (/\b(network|cilad|cillad|server|fariin|sms|otp|soo\s*dhici\s*waayay|ma\s*soo\s*dhicin|qadka)\b/i.test(lower)) {
    clauses.push('Customer reported network connectivity issues or delayed SMS confirmation codes');
  }

  // 8. Daily transaction limits
  if (/\b(xadka|xad\s*yar|limit-?ka|limit\s*yar|daily\s*limit)\b/i.test(lower)) {
    clauses.push('Customer noted that daily transaction/withdrawal limits are too restrictive');
  }

  // 9. KYC / National ID / Passport barrier (strictly whole-word \bid\b or Somali KYC words!)
  if (/\b(aqoonsi|aqoonsiga|\bid\b|id-?ga|baasaboor|passport|dukumeenti|sharci)\b/i.test(lower)) {
    clauses.push('Customer lacks required ID/passport verification documents to complete KYC upgrade');
  }

  // 10. Competitor wallet preference
  if (/\b(zaad|evc|sahal|e-?dahab|telesom|hormuud|golis|premier|adeeg\s*kale|shirkad\s*kale)\b/i.test(lower)) {
    const comp = extractCompetitorMentions(lower);
    clauses.push(`Customer stated they primarily use ${comp}`);
  }

  // 11. Financial constraints / No funds right now
  if (
    /\b(lacag\s*ma\s*haysto|lacag\s*ma\s*hayo|lacag\s*uma\s*hayo|dhaqaale\s*ma\s*jiro|dhaqaale\s*xumo|lacag\s*la'aan|hadda\s*ma\s*awoodo|mushahar\s*sugayaa|markaan\s*lacag\s*helo)\b/i.test(
      lower
    )
  ) {
    clauses.push(`Customer stated they currently lack funds to deposit${timeHint ? ` and will transact${timeHint}` : ''}`);
  }

  // 12. Busy / At work / In prayer / Callback requested
  const isBusy = /\b(mashquul|fursad\s*ma\s*hayo|waqti\s*ma\s*hayo|busy|shaqo\s*ku\s*jiraa|shir|salaad|gaari\s*wadaa|safar\s*ku\s*jiraa)\b/i.test(lower);
  const asksCallback =
    /\b(dib\s*u\s*soo\s*wac|dib\s*ii\s*soo\s*wac|dib\s*u\s*wac|ballan|balan|igula\s*soo\s*xiriir|soo\s*wac\s*(berri|bari|galabta|subaxda|caawa|hadhow|markale))\b/i.test(
      lower
    );

  if (isBusy && asksCallback) {
    clauses.push(`Customer was busy and requested a callback${timeHint || ' at a more convenient time'}`);
  } else if (isBusy) {
    clauses.push(`Customer was busy (at work/meeting)${timeHint ? ` and asked to reconnect${timeHint}` : ' and could not talk at length'}`);
  } else if (asksCallback) {
    clauses.push(`Customer requested a follow-up callback${timeHint || ' at an agreed scheduled time'}`);
  }

  // 13. Unreachable / Phone off / Unanswered call log
  if (clauses.length === 0 && isUnreachableCallLogNote(clean)) {
    if (/\b(dansan|damisan|xiran|off)\b/i.test(lower)) {
      return 'Customer phone was switched off or unreachable at the time of calling.';
    }
    return 'Customer did not answer the phone call.';
  }

  // 14. Positive / Agreed to Reactivate / Deposit / Happy with MyCash (ONLY when not negated, or explicitly affirmative!)
  const hasExplicitAgreement =
    /\b(wuu\s*ogolaaday|way\s*ogolaatay|waan\s*ogolaaday|wuu\s*aqbalay|way\s*aqbashay|ballan\s*qaaday|balan\s*qaaday|waan\s*isticmaalayaa|waan\s*isticmaali\s*doonaa|dib\s*u\s*bilaabayaa|dib\s*u\s*isticmaalayaa|waan\s*ku\s*shuban|wuu\s*ku\s*shuban|waan\s*soo\s*shuban|lacag\s*ayaan\s*dhigan|waan\s*furanayaa|waan\s*ka\s*shaqaysiinayaa)\b/i.test(
      lower
    );

  const hasActiveUsage =
    !negated &&
    /\b(waan\s*isticmaalaa|wuu\s*isticmaalaa|way\s*isticmaashaa|si\s*fiican\s*u\s*isticmaalaa|horey?\s*u\s*isticmaalaa|akoon\s*active\s*ah)\b/i.test(
      lower
    );

  const hasPraise =
    !negated &&
    /\b(ku\s*faraxsan|aad\s*u\s*fiican|adeeg\s*fiican|adeeg\s*wanaagsan|waan\s*ku\s*qancay|wuu\s*ku\s*qancay|mahadsanid|mahadsanidiin|aad\s*baad\s*u\s*mahadsan|fudud|degdeg)\b/i.test(
      lower
    );

  if (hasExplicitAgreement) {
    clauses.push(`Customer agreed to reactivate and start using their MyCash account${timeHint}`);
  }
  if (hasActiveUsage && !hasExplicitAgreement) {
    clauses.push('Customer confirmed they actively use their MyCash account');
  }
  if (hasPraise) {
    clauses.push('Customer expressed satisfaction and appreciation for MyCash service speed and convenience');
  }

  // 15. Explicit refusal / Dissatisfaction when negated
  if (
    /\b(ma\s*rabo|ma\s*rabto|ma\s*doonayo|wuu\s*diiday|way\s*diiday|diidmo|dan\s*kama\s*lihi|baahi\s*uma\s*qabo|uma\s*baahni|iska\s*xira|iga\s*xira)\b/i.test(
      lower
    )
  ) {
    clauses.push('Customer declined the offer and stated they do not wish to use the account at this time');
  } else if (negated && /\b(fiicna|wanaagsana|qanacsani|qancin)\b/i.test(lower)) {
    clauses.push('Customer expressed dissatisfaction with the service experience');
  } else if (negated && /\b(isticmaalo|isticmaalin)\b/i.test(lower) && clauses.length === 0) {
    clauses.push(`Customer stated they have not been using the account recently${timeHint ? ` and will review${timeHint}` : ''}`);
  }

  // 16. Soft consideration ("Insha Allah / Haye / Waan eegi doonaa")
  if (clauses.length === 0 && /\b(insha\s*allah|inshallah|haye|waa\s*hagaag|waan\s*ka\s*fiirsan|waan\s*eegi)\b/i.test(lower)) {
    clauses.push(`Customer acknowledged the call positively and agreed to consider using the account${timeHint}`);
  }

  if (clauses.length > 0) {
    return clauses.join('; ') + '.';
  }

  // Token-assisted fallback for rare notes so it never outputs misleading canned errors
  return `Customer feedback note: "${clean}"`;
}

/**
 * Cleanly parses any raw or formatted quote into a structured BilingualQuote object,
 * prioritizing Gemini AI's exact contextual translation map whenever available.
 */
export function parseBilingualQuote(
  rawQuote: string,
  translationMap?: Record<string, BilingualQuote>
): BilingualQuote {
  if (!rawQuote || rawQuote.trim().length === 0) {
    return { original: '', english: '', language: 'English' };
  }

  const trimmed = rawQuote.trim();

  // 1. Check direct lookup in Gemini's noteTranslations map first
  if (translationMap) {
    const cleanKey = trimmed.replace(/^["']+|["']+$/g, '').trim();
    const directHit = translationMap[cleanKey] || translationMap[cleanKey.toLowerCase()];
    if (directHit && directHit.english) {
      return directHit;
    }
  }

  // 2. Check if string already carries an embedded translation in any common separator style:
  //    e.g. "Somali text" — (English translation: "English text")
  //    or   "Somali text" - (English: "English text")
  const sepRegex =
    /^["']?([\s\S]+?)["']?\s*(?:—|–|-|\|)\s*\(?(?:English\s*translation|English|Translation)\s*:\s*["']?([\s\S]+?)["']?\)?$/i;
  const match = trimmed.match(sepRegex);

  if (match) {
    const origPart = match[1].replace(/^["']+|["']+$/g, '').trim();
    let engPart = match[2].replace(/\)+$/, '').replace(/^["']+|["']+$/g, '').trim();

    // Check if origPart exists in Gemini's translationMap for even higher quality
    if (translationMap) {
      const hit = translationMap[origPart] || translationMap[origPart.toLowerCase()];
      if (hit && hit.english) {
        return hit;
      }
    }

    const detectedLang = detectNoteLanguage(origPart);
    if (!engPart || engPart.toLowerCase() === origPart.toLowerCase()) {
      engPart = translateSomaliQuoteToEnglish(origPart);
    }

    return {
      original: origPart,
      english: engPart,
      language: detectedLang,
    };
  }

  // 3. Plain raw note
  const cleanOrig = trimmed.replace(/^["']+|["']+$/g, '').trim();
  if (translationMap) {
    const hit = translationMap[cleanOrig] || translationMap[cleanOrig.toLowerCase()];
    if (hit && hit.english) {
      return hit;
    }
  }

  const detectedLang = detectNoteLanguage(cleanOrig);
  const english =
    detectedLang === 'English'
      ? cleanOrig.charAt(0).toUpperCase() + cleanOrig.slice(1)
      : translateSomaliQuoteToEnglish(cleanOrig);

  return {
    original: cleanOrig,
    english,
    language: detectedLang,
  };
}

/**
 * Formats a BilingualQuote or raw quote string into a clean string representation (used by PDF export & legacy callers).
 */
export function formatQuoteWithTranslation(
  rawQuote: string,
  translationMap?: Record<string, BilingualQuote>
): string {
  const parsed = parseBilingualQuote(rawQuote, translationMap);
  if (!parsed.original) return '';
  if (parsed.language === 'English') {
    return `"${parsed.original}"`;
  }
  return `"${parsed.original}" — (English translation: "${parsed.english}")`;
}

/**
 * Classifies a customer record's decision polarity based on BOTH status AND customer feedback note semantics.
 * Accounts for the portal rule where Agents cannot manually select 'Success' (which is auto-awarded on <30d dormancy),
 * so positive/affirmative customer commitments in 'In-progress' are accurately recognized as YES decisions!
 */
export type RecordDecisionPolarity =
  | 'YES_DECISION'
  | 'NO_DECISION'
  | 'CALLBACK_ONLY'
  | 'UNREACHABLE_LOG'
  | 'UNCALLED'
  | 'NEUTRAL_CONTACT';

export function classifyRecordDecision(r: CustomerRecord): RecordDecisionPolarity {
  const isCalled = Boolean(r.hasBeenCalled || (r.status && r.status !== 'Uncalled'));
  const note = (r.feedbackNote || '').trim();
  const lower = note.toLowerCase();

  // 1. Explicit Success status (e.g. <30d dormant auto-promoted or supervisor verified)
  if (r.status === 'Success') {
    return 'YES_DECISION';
  }

  // 2. Explicit Rejected status
  if (r.status === 'Rejected') {
    return 'NO_DECISION';
  }

  if (!isCalled && !note) {
    return 'UNCALLED';
  }

  // 3. Unreachable phone / unanswered call log (Not Available or unanswered note)
  if (r.status === 'Not Available' && (!note || isUnreachableCallLogNote(note))) {
    return 'UNREACHABLE_LOG';
  }
  if (note && isUnreachableCallLogNote(note)) {
    return 'UNREACHABLE_LOG';
  }

  // 4. Analyze written customer feedback note polarity (with negation awareness!)
  if (note.length > 0) {
    const negated = hasSomaliOrEnglishNegation(lower);

    // Check strong objections / barriers / complaints first
    const hasObjectionOrBarrier =
      isRepeatedCallComplaintRecord(r) ||
      /\b(wuu\s*diiday|way\s*diiday|diidmo|ma\s*rabo|ma\s*doonayo|dan\s*kama\s*lihi|baahi\s*uma\s*qabo|uma\s*baahni|not\s*interested|declined|refused)\b/i.test(lower) ||
      /\b(zaad|evc|sahal|e-?dahab|adeeg\s*kale|shirkad\s*kale)\b/i.test(lower) ||
      /\b(lacag\s*ma\s*haysto|lacag\s*ma\s*hayo|dhaqaale\s*ma\s*jiro|dhaqaale\s*xumo|hadda\s*ma\s*awoodo|insufficient\s*funds|no\s*money)\b/i.test(lower) ||
      /\b(kharash|qaali|lacag\s*jaris|khidmad|high\s*fee|too\s*expensive)\b/i.test(lower) ||
      /\b(qof\s*kale|nambar\s*qaldan|number\s*qaldan|wrong\s*number|dhintay|geeriyooday|deceased)\b/i.test(lower) ||
      /\b(ilaaway|iloobay|forgot\s*pin|xirmay|locked|lumay|xaday|lost\s*sim|cilad|network|ma\s*soo\s*dhicin)\b/i.test(lower) ||
      (negated && /\b(fiicna|wanaagsana|qanacsani|isticmaalo)\b/i.test(lower));

    // Check explicit positive commitment / praise / active usage
    const hasPositiveYes =
      /\b(ogolaaday|ogolaatay|aqbalay|aqbashay|ballan\s*qaaday|balan\s*qaaday|waan\s*isticmaalayaa|isticmaali\s*doonaa|dib\s*u\s*bilaabayaa|dib\s*u\s*isticmaalayaa|ku\s*shuban|soo\s*shuban|dhigan\s*doonaa|furanayaa|agreed|promised\s*to\s*(use|deposit|activate|reactivate|transact)|will\s*(deposit|reactivate|activate|use|transact))\b/i.test(
        lower
      ) ||
      (!negated &&
        /\b(ku\s*faraxsan|aad\s*u\s*fiican|adeeg\s*fiican|adeeg\s*wanaagsan|ku\s*qancay|mahadsanid|waan\s*isticmaalaa|wuu\s*isticmaalaa|happy|satisfied|actively\s*using|good\s*service|great\s*service)\b/i.test(
          lower
        ));

    if (hasPositiveYes && !hasObjectionOrBarrier) {
      return 'YES_DECISION';
    }
    if (hasObjectionOrBarrier && !hasPositiveYes) {
      return 'NO_DECISION';
    }
    if (hasPositiveYes && hasObjectionOrBarrier) {
      // e.g., "PIN-ka ayuu ilaaway laakiin wuu ogolaaday inuu dib u isticmaalo" -> barrier + willingness; count as NO_DECISION if blocked or YES_DECISION if agreed
      return /\b(ogolaaday|aqbalay|ballan\s*qaaday|agreed|promised)\b/i.test(lower) ? 'YES_DECISION' : 'NO_DECISION';
    }
  }

  if (isAppointmentRecord(r)) {
    return 'CALLBACK_ONLY';
  }

  return isCalled ? 'NEUTRAL_CONTACT' : 'UNCALLED';
}

/**
 * Normalizes percentage shares across a list of grouped items so they always fall cleanly in 0..100% and sum to ~100%.
 */
function normalizeItemPercentages<T extends { count: number; percentage: number }>(items: T[]): T[] {
  const totalCount = items.reduce((acc, item) => acc + Math.max(0, item.count || 0), 0);
  if (totalCount <= 0) {
    return items.map(item => ({ ...item, percentage: 0 }));
  }
  return items.map(item => ({
    ...item,
    percentage: Math.min(100, Math.max(1, Math.round((Math.max(0, item.count) / totalCount) * 100))),
  }));
}

// ============================================================================
// SERVER-SIDE GEMINI API DISPATCHERS
// ============================================================================

async function executeGeminiAnalysisPrompt(
  prompt: string,
  systemInstruction: string
): Promise<{ data: any; engine: string }> {
  const response = await fetch('/api/ai-intelligence', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      systemInstruction,
      useAnalysisSchema: true,
      candidateModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ error: `Server returned status ${response.status}` }));
    throw new Error(errBody.error || `Server AI endpoint returned status ${response.status}`);
  }

  const resJson = await response.json();
  if (!resJson.success || !resJson.data) {
    throw new Error(resJson.error || 'Server did not return valid analysis data');
  }

  const label =
    resJson.model === 'gemini-4-hydrogen'
      ? 'Gemini 4 Flash (Hydrogen)'
      : resJson.model || 'Gemini 4 Flash';

  return {
    data: resJson.data,
    engine: label,
  };
}

export async function generateServerContent(prompt: string, model: string = 'gemini-4-hydrogen'): Promise<string> {
  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Failed to generate server content: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.text || '';
}

export async function* streamServerContent(prompt: string, model: string = 'gemini-4-hydrogen'): AsyncGenerator<string> {
  const res = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to stream content: HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6).trim();
      if (dataStr === '[DONE]') return;
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.text) yield parsed.text;
      } catch {
        // ignore incomplete chunks
      }
    }
  }
}

// ============================================================================
// DETERMINISTIC GROUND-TRUTH ANALYTICAL ENGINE (BASELINE & OFFLINE FALLBACK)
// ============================================================================

export function generateOfflineHeuristicAnalysis(
  records: CustomerRecord[],
  branches: BranchInfo[],
  agents: User[],
  datePeriod?: string
): AiAnalysisResult {
  const total = Math.max(1, records.length);
  const calledRecords = records.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled'));
  const uncalledRecords = records.filter(r => !r.hasBeenCalled && (!r.status || r.status === 'Uncalled'));
  const successRecords = records.filter(r => r.status === 'Success');
  const rejectedRecords = records.filter(r => r.status === 'Rejected');
  const appointmentRecords = records.filter(isAppointmentRecord);
  const recordsWithNotes = records.filter(r => r.feedbackNote && r.feedbackNote.trim().length > 0);

  // Classify every record's decision polarity accurately
  const yesDecisionRecords: CustomerRecord[] = [];
  const agreedInProgressRecords: CustomerRecord[] = [];
  const noDecisionRecords: CustomerRecord[] = [];
  const unreachableLogRecords: CustomerRecord[] = [];

  records.forEach(r => {
    const pol = classifyRecordDecision(r);
    if (pol === 'YES_DECISION') {
      yesDecisionRecords.push(r);
      if (r.status !== 'Success') agreedInProgressRecords.push(r);
    } else if (pol === 'NO_DECISION') {
      noDecisionRecords.push(r);
    } else if (pol === 'UNREACHABLE_LOG') {
      unreachableLogRecords.push(r);
    }
  });

  // Build local translation lookup for all unique notes
  const noteTranslations: Record<string, BilingualQuote> = {};
  recordsWithNotes.forEach(r => {
    const clean = r.feedbackNote.trim();
    if (!noteTranslations[clean]) {
      const parsed = parseBilingualQuote(clean);
      noteTranslations[clean] = parsed;
      noteTranslations[clean.toLowerCase()] = parsed;
    }
  });

  const toBilingualQuotes = (recs: CustomerRecord[], max = 4): { quotes: string[]; bilingual: BilingualQuote[] } => {
    const uniqueNotes = Array.from(
      new Set(
        recs
          .map(r => (r.feedbackNote || '').trim())
          .filter(n => n.length > 0 && !isUnreachableCallLogNote(n))
      )
    ).slice(0, max);

    const bilingual = uniqueNotes.map(n => parseBilingualQuote(n, noteTranslations));
    const quotes = bilingual.map(bq =>
      bq.language === 'English' ? `"${bq.original}"` : `"${bq.original}" — (English translation: "${bq.english}")`
    );
    return { quotes, bilingual };
  };

  // Categorize real complaints & barriers using strict word boundaries (NO 'lacag' or 'id' false positives!)
  const repeatedCallRecords: CustomerRecord[] = [];
  const feeRecords: CustomerRecord[] = [];
  const netRecords: CustomerRecord[] = [];
  const appPinRecords: CustomerRecord[] = [];
  const simLostRecords: CustomerRecord[] = [];
  const limitRecords: CustomerRecord[] = [];
  const kycRecords: CustomerRecord[] = [];

  // Yes sub-themes
  const activeHappyRecords: CustomerRecord[] = [];
  const promisedReactivateRecords: CustomerRecord[] = [];

  // No / Objection sub-themes
  const competitorRecords: CustomerRecord[] = [];
  const busyTimingRecords: CustomerRecord[] = [];
  const financialConstraintRecords: CustomerRecord[] = [];
  const wrongNumberOrAbroadRecords: CustomerRecord[] = [];
  const explicitRefusalRecords: CustomerRecord[] = [];

  recordsWithNotes.forEach(r => {
    const note = r.feedbackNote.trim();
    const lower = note.toLowerCase();
    if (isUnreachableCallLogNote(note)) return;

    const negated = hasSomaliOrEnglishNegation(lower);

    // Complaints
    if (isRepeatedCallComplaintRecord(r)) repeatedCallRecords.push(r);
    if (/\b(kharash|kharashka|qaali|lacag\s*jaris|laga\s*jarayo|commission|khidmad|cashuur|high\s*fee|expensive)\b/i.test(lower)) {
      feeRecords.push(r);
    }
    if (/\b(network|cilad|cillad|server|fariin|sms|otp|soo\s*dhici\s*waayay|ma\s*soo\s*dhicin)\b/i.test(lower)) {
      netRecords.push(r);
    }
    if (/\b(pin-?ka|pin|password|furaha|sirta|login|app-?ka|ilaaway|iloobay|xirmay|block|forgot\s*pin|locked)\b/i.test(lower)) {
      appPinRecords.push(r);
    }
    if (/\b(sim-?ka|simcard|kaarka)\b/i.test(lower) && /\b(lumay|xaday|jabtay|bedelay|lost)\b/i.test(lower)) {
      simLostRecords.push(r);
    }
    if (/\b(xadka|xad\s*yar|limit-?ka|limit\s*yar|daily\s*limit)\b/i.test(lower)) {
      limitRecords.push(r);
    }
    if (/\b(aqoonsi|aqoonsiga|\bid\b|id-?ga|baasaboor|passport|dukumeenti)\b/i.test(lower)) {
      kycRecords.push(r);
    }

    // Positive / Yes themes
    const pol = classifyRecordDecision(r);
    if (pol === 'YES_DECISION') {
      if (
        /\b(ogolaaday|aqbalay|ballan\s*qaaday|isticmaalayaa|isticmaali\s*doonaa|dib\s*u\s*bilaabayaa|ku\s*shuban|soo\s*shuban|promised|agreed|will\s*deposit|will\s*reactivate|will\s*use)\b/i.test(
          lower
        )
      ) {
        promisedReactivateRecords.push(r);
      } else if (!negated) {
        activeHappyRecords.push(r);
      }
    }

    // No / Objection themes
    if (/\b(zaad|evc|sahal|e-?dahab|telesom|hormuud|golis|premier|adeeg\s*kale|shirkad\s*kale)\b/i.test(lower)) {
      competitorRecords.push(r);
    }
    if (/\b(mashquul|fursad\s*ma\s*hayo|waqti\s*ma\s*hayo|busy|shaqo\s*ku\s*jiraa|shir|salaad)\b/i.test(lower) && pol === 'NO_DECISION') {
      busyTimingRecords.push(r);
    }
    if (/\b(lacag\s*ma\s*haysto|lacag\s*ma\s*hayo|dhaqaale\s*ma\s*jiro|dhaqaale\s*xumo|lacag\s*la'aan|hadda\s*ma\s*awoodo|no\s*money|insufficient\s*funds)\b/i.test(lower)) {
      financialConstraintRecords.push(r);
    }
    if (/\b(qof\s*kale|nambar\s*qaldan|number\s*qaldan|wrong\s*number|dhintay|geeriyooday|dibadda|dalka\s*ma\s*joogo|abroad|miyi|baadiye)\b/i.test(lower)) {
      wrongNumberOrAbroadRecords.push(r);
    }
    if (/\b(ma\s*rabo|ma\s*doonayo|wuu\s*diiday|way\s*diiday|diidmo|dan\s*kama\s*lihi|baahi\s*uma\s*qabo|not\s*interested|refused|declined)\b/i.test(lower)) {
      explicitRefusalRecords.push(r);
    }
  });

  // 1. Build Top Complaints (ONLY real complaints!)
  const complaintDefs = [
    {
      issue: 'Repeated Calls & Over-Dialing Contact Fatigue',
      category: 'Dialer Governance',
      records: repeatedCallRecords,
      severity: 'CRITICAL' as const,
      rootCause: 'Customers reported being called multiple times within a short period, causing frustration.',
      actionRecommendation: 'Check call history before dialing and enforce a 72-hour cooldown after speaking with a customer.',
    },
    {
      issue: 'Forgot PIN, Locked Account, or App Login Difficulty',
      category: 'Account Access & PIN Support',
      records: appPinRecords,
      severity: 'HIGH' as const,
      rootCause: 'Dormant customers forgot their PIN code or got locked out of the MyCash app and could not transact.',
      actionRecommendation: 'Allow calling agents to trigger instant assisted PIN reset / account unlock verification during the call.',
    },
    {
      issue: 'Transaction & Transfer Fee Concerns',
      category: 'Pricing & Tariffs',
      records: feeRecords,
      severity: 'HIGH' as const,
      rootCause: 'Customers perceive transfer or withdrawal fees as higher than competing local mobile wallets.',
      actionRecommendation: 'Highlight zero-fee merchant payments and offer reactivation fee waivers for returning dormant accounts.',
    },
    {
      issue: 'Network Connectivity & Delayed SMS Codes',
      category: 'System & SMS Delivery',
      records: netRecords,
      severity: 'CRITICAL' as const,
      rootCause: 'Delayed OTP/confirmation SMS messages or local network instability prevented smooth usage.',
      actionRecommendation: 'Escalate affected phone prefixes to technical support and verify multi-carrier SMS routing.',
    },
    {
      issue: 'Lost or Changed Registered SIM Card',
      category: 'SIM & Phone Recovery',
      records: simLostRecords,
      severity: 'MEDIUM' as const,
      rootCause: 'Customers lost or replaced the phone line linked to their MyCash account.',
      actionRecommendation: 'Provide streamlined phone-number migration at local branches so balances and accounts are recovered.',
    },
    {
      issue: 'Daily Transaction & Withdrawal Ceiling Limits',
      category: 'Account Tier Limits',
      records: limitRecords,
      severity: 'MEDIUM' as const,
      rootCause: 'Business and frequent users find entry-level daily limits too low for commercial transfers.',
      actionRecommendation: 'Fast-track Tier 2 KYC upgrades for active merchants and business account holders.',
    },
    {
      issue: 'Missing National ID or KYC Verification Documents',
      category: 'KYC & Onboarding',
      records: kycRecords,
      severity: 'MEDIUM' as const,
      rootCause: 'Customers lack physical ID or passport documents needed to complete full verification.',
      actionRecommendation: 'Accept approved alternative local identification or branch-verified guarantor forms.',
    },
  ];

  const activeComplaints = complaintDefs.filter(c => c.records.length > 0);
  const topComplaints: AiComplaintItem[] = normalizeItemPercentages(
    activeComplaints.map(g => {
      const affectedBranches = Array.from(
        new Set(g.records.map(r => (r.areaOfReg || '').trim()).filter(b => b && b.toLowerCase() !== 'unassigned'))
      );
      const { quotes, bilingual } = toBilingualQuotes(g.records, 4);
      return {
        issue: g.issue,
        category: g.category,
        count: g.records.length,
        percentage: 0,
        severity: g.severity,
        affectedBranches: affectedBranches.length > 0 ? affectedBranches : ['General'],
        customerQuotes: quotes,
        bilingualQuotes: bilingual,
        rootCause: g.rootCause,
        actionRecommendation: g.actionRecommendation,
      };
    })
  );

  // 2. Build "Why Customers Said Yes" (topAppreciations) — supports BOTH verified Success (<30d dormant) AND In-progress reactivation commitments!
  const rawAppreciations: AiAppreciationItem[] = [];

  if (promisedReactivateRecords.length > 0) {
    const { quotes, bilingual } = toBilingualQuotes(promisedReactivateRecords, 4);
    const convBranches = Array.from(new Set(promisedReactivateRecords.map(r => r.areaOfReg?.trim()).filter(Boolean))) as string[];
    rawAppreciations.push({
      theme: 'Agreed to Reactivate Account & Resume Transactions',
      count: promisedReactivateRecords.length,
      percentage: 0,
      customerQuotes: quotes,
      bilingualQuotes: bilingual,
      keyDriver: 'Polite agent outreach reminded dormant customers of their MyCash account benefits, securing clear commitments to deposit and transact.',
      convertingBranches: convBranches,
    });
  }

  const remainingYesRecords = yesDecisionRecords.filter(r => !promisedReactivateRecords.some(p => p.id === r.id));
  if (activeHappyRecords.length > 0 || remainingYesRecords.length > 0) {
    const pool = activeHappyRecords.length > 0 ? activeHappyRecords : remainingYesRecords;
    const { quotes, bilingual } = toBilingualQuotes(pool, 4);
    const convBranches = Array.from(new Set(pool.map(r => r.areaOfReg?.trim()).filter(Boolean))) as string[];
    rawAppreciations.push({
      theme:
        successRecords.length > 0
          ? 'Active Account Usage & Verified Customer Reactivation (<30d Dormant)'
          : 'Positive Service Satisfaction & Active MyCash Usage',
      count: pool.length,
      percentage: 0,
      customerQuotes:
        quotes.length > 0
          ? quotes
          : [`"${pool.length} verified active customer(s) (<30 days dormant)"`],
      bilingualQuotes:
        bilingual.length > 0
          ? bilingual
          : [
              {
                original: `${pool.length} customer(s) actively transacting within the last 30 days (Success status).`,
                english: `${pool.length} customer(s) resumed transacting and dropped below 30 dormant days.`,
                language: 'English',
              },
            ],
      keyDriver: 'Fast transaction speed, ease of transfers, and reliable branch support encouraged continued MyCash usage.',
      convertingBranches: convBranches,
    });
  }

  const topAppreciations = normalizeItemPercentages(rawAppreciations);

  // 3. Build "Why Customers Declined / Hesitated" (rejectionAnalysis) — captures ALL real customer objections & dormancy reasons!
  const objectionDefs = [
    {
      reason: 'Using Alternative Mobile Money Wallets (EVC Plus / Zaad / Sahal / e-Dahab)',
      records: competitorRecords,
      customerExplanation: 'Customers already use a competing mobile money service for daily spending and had not prioritized funding MyCash.',
      overcomingScript: 'Position MyCash as a zero-fee banking & merchant wallet alongside their primary SIM wallet for safer savings and free transfers.',
    },
    {
      reason: 'Temporary Lack of Funds / Waiting for Income to Deposit',
      records: financialConstraintRecords,
      customerExplanation: 'Customers stated they currently have no spare cash to deposit until payday or business collections.',
      overcomingScript: 'Reassure the customer there is zero maintenance penalty for keeping the account open, and schedule a payday reminder.',
    },
    {
      reason: 'Forgot PIN, App Locked, or Lost Registered SIM Card',
      records: [...appPinRecords, ...simLostRecords.filter(s => !appPinRecords.some(a => a.id === s.id))],
      customerExplanation: 'Customers stopped transacting because they forgot their PIN, got locked out of the app, or changed their SIM card.',
      overcomingScript: 'Walk the customer through instant PIN reset verification right on the call or connect them to their nearest branch desk.',
    },
    {
      reason: 'Direct Refusal / No Current Need for Account',
      records: explicitRefusalRecords,
      customerExplanation: 'Customers stated they are not interested or do not currently need an active digital banking wallet.',
      overcomingScript: 'Acknowledge politely without pressure, ask one brief question on what would make MyCash useful later, and pause follow-ups for 30 days.',
    },
    {
      reason: 'Wrong Phone Number, Relocated Abroad, or Rural Area Without Internet',
      records: wrongNumberOrAbroadRecords,
      customerExplanation: 'The dialed phone number belongs to a new owner, or the customer is abroad / in a rural area without internet access.',
      overcomingScript: 'Flag wrong numbers immediately for data cleanup, and inform rural customers about USSD/offline access options where available.',
    },
    {
      reason: 'Customer Busy During Call (Work / Meeting / Prayer)',
      records: busyTimingRecords,
      customerExplanation: 'Customer could not speak when called due to work, travel, or prayer time.',
      overcomingScript: 'Apologize for the interruption and ask: "Would 4:00 PM today or 10:00 AM tomorrow work better for a quick 2-minute call?"',
    },
    {
      reason: 'Frustration Over Repeated Calls',
      records: repeatedCallRecords,
      customerExplanation: 'Customer declined because they felt contacted too many times.',
      overcomingScript: 'Apologize sincerely, confirm their number is placed on a contact cooldown, and avoid re-dialing.',
    },
  ];

  const activeObjections = objectionDefs.filter(o => o.records.length > 0);
  const coveredRejectionIds = new Set(activeObjections.flatMap(o => o.records.map(r => r.id)));
  const uncategorizedRejected = rejectedRecords.filter(r => !coveredRejectionIds.has(r.id));

  const rawRejections: AiRejectionItem[] = activeObjections.map(g => {
    const affectedBranches = Array.from(new Set(g.records.map(r => r.areaOfReg?.trim()).filter(Boolean))) as string[];
    const { quotes, bilingual } = toBilingualQuotes(g.records, 4);
    return {
      reason: g.reason,
      count: g.records.length,
      percentage: 0,
      customerQuotes: quotes,
      bilingualQuotes: bilingual,
      customerExplanation: g.customerExplanation,
      overcomingScript: g.overcomingScript,
      affectedBranches,
    };
  });

  if (uncategorizedRejected.length > 0) {
    const { quotes, bilingual } = toBilingualQuotes(uncategorizedRejected, 3);
    rawRejections.push({
      reason: 'Call Declined Without Specific Reason Logged',
      count: uncategorizedRejected.length,
      percentage: 0,
      customerQuotes: quotes,
      bilingualQuotes: bilingual,
      customerExplanation: `${uncategorizedRejected.length} customer(s) were marked as Rejected without a detailed written explanation in the feedback column.`,
      overcomingScript: 'Encourage calling agents to write the exact customer reason in the Feedback Note column whenever a call is declined.',
      affectedBranches: Array.from(new Set(uncategorizedRejected.map(r => r.areaOfReg?.trim()).filter(Boolean))) as string[],
    });
  }

  const rejectionAnalysis = normalizeItemPercentages(rawRejections);

  // 4. Appointments
  const sampleAppointments: AiAppointmentDetail[] = appointmentRecords.slice(0, 25).map(r => {
    const rawNote = (r.feedbackNote || '').trim();
    const bq = rawNote ? parseBilingualQuote(rawNote, noteTranslations) : undefined;
    return {
      customerName: r.customerName,
      phoneNumber: r.phoneNumber,
      agentName: r.assignedAgentName || 'Unassigned',
      branch: r.areaOfReg || 'General',
      appointmentTime: r.appointment && r.appointment.trim().length > 1 ? r.appointment : 'Callback Requested in Note',
      feedbackNote: rawNote ? formatQuoteWithTranslation(rawNote, noteTranslations) : 'Follow-up callback scheduled',
      bilingualNote: bq,
      status: r.status,
    };
  });

  const apptCount = appointmentRecords.length;
  const apptRate = calledRecords.length > 0 ? Math.round((apptCount / calledRecords.length) * 100) : 0;

  const appointmentInsights: AiAppointmentInsight = {
    totalAppointments: apptCount,
    appointmentRate: apptRate,
    keyObservations:
      apptCount > 0
        ? `${apptCount} customer callback appointment(s) are scheduled (${apptRate}% of completed calls). Calling these warm prospects on time is the fastest path to reactivation.`
        : 'No scheduled callback appointments are currently logged in this selection.',
    actionableFollowupAdvice:
      apptCount > 0
        ? 'Call every scheduled customer within 5–10 minutes of their agreed time window and reference their previous note immediately.'
        : 'Whenever a customer is busy or waiting for funds, book a concrete callback date and time in the Appointment column.',
    sampleAppointments,
  };

  // 5. Discover effective agents & compute Branch + Agent performance
  const allAgentsMap = new Map<string, User>();
  agents.forEach(a => {
    const cleanKey = a.name.toLowerCase().replace(/^agent\s+/i, '').trim();
    allAgentsMap.set(cleanKey, a);
  });

  records.forEach(r => {
    const name = (r.assignedAgentName || '').trim();
    if (name && name.toLowerCase() !== 'unassigned') {
      const cleanKey = name.toLowerCase().replace(/^agent\s+/i, '').trim();
      if (!allAgentsMap.has(cleanKey)) {
        allAgentsMap.set(cleanKey, {
          id: r.assignedAgentId || `agent-${cleanKey.replace(/\s+/g, '-')}`,
          name,
          email: `${cleanKey.replace(/\s+/g, '.')}@mycash.so`,
          role: 'TEAM_MEMBER',
          branch: r.areaOfReg || 'Headquarters',
          active: true,
        });
      }
    }
  });

  const effectiveAgents = Array.from(allAgentsMap.values());

  const branchPerformances: AiBranchPerformanceItem[] = branches.map(b => {
    const bRecords = records.filter(r => isRecordInBranch(r, b, effectiveAgents));
    const bCalled = bRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
    const bYes = bRecords.filter(r => classifyRecordDecision(r) === 'YES_DECISION').length;
    const convRate = bCalled > 0 ? Math.round((bYes / bCalled) * 100) : 0;
    const substantiveNotes = bRecords
      .map(r => (r.feedbackNote || '').trim())
      .filter(n => n.length > 0 && !isUnreachableCallLogNote(n));

    let dominant = 'No written feedback notes yet';
    if (substantiveNotes.length > 0) {
      const bq = parseBilingualQuote(substantiveNotes[0], noteTranslations);
      dominant = bq.language === 'English' ? bq.original : `"${bq.original}" (${bq.english})`;
    } else if (bRecords.length === 0) {
      dominant = 'No leads assigned to branch';
    }

    return {
      branchName: b.name,
      totalLeads: bRecords.length,
      callsMade: bCalled,
      conversions: bYes,
      successRate: convRate,
      dominantComplaint: dominant,
      strengths:
        convRate >= 35
          ? 'Strong customer agreement & reactivation rate'
          : bCalled > 0
          ? 'Active outbound calling underway'
          : 'Ready to begin outbound calling',
      bottlenecks:
        bCalled < bRecords.length * 0.5
          ? `${bRecords.length - bCalled} uncalled leads remaining`
          : convRate < 25
          ? 'Customer dormancy & competitor wallet objections'
          : 'Healthy pipeline',
      managerialAdvice:
        convRate < 30
          ? 'Support customers with PIN resets on the spot and pitch zero-fee MyCash transfers.'
          : 'Verify reactivation commitments on next Excel re-upload (<30d dormancy).',
    };
  });

  const agentSummaries: AiAgentPerformanceItem[] = effectiveAgents
    .map(ag => {
      const agRecords = records.filter(r => isRecordAssignedToAgent(r, ag));
      const agCalled = agRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;
      const agYes = agRecords.filter(r => classifyRecordDecision(r) === 'YES_DECISION').length;
      const agNo = agRecords.filter(r => classifyRecordDecision(r) === 'NO_DECISION').length;
      const convRate = agCalled > 0 ? Math.round((agYes / agCalled) * 100) : 0;
      const agSubstantiveNotes = agRecords
        .map(r => (r.feedbackNote || '').trim())
        .filter(n => n.length > 0 && !isUnreachableCallLogNote(n));
      const agRepeated = agRecords.filter(isRepeatedCallComplaintRecord);

      let sentiment = `${agCalled} calls made (${agYes} positive/agreed, ${agNo} declined/barriers).`;
      if (agRepeated.length > 0) {
        const bq = parseBilingualQuote(agRepeated[0].feedbackNote, noteTranslations);
        sentiment += ` Repeated-call pushback noted: "${bq.original}" (${bq.english}).`;
      } else if (agSubstantiveNotes.length > 0) {
        const bq = parseBilingualQuote(agSubstantiveNotes[0], noteTranslations);
        sentiment += ` Sample note: ${bq.english}`;
      }

      let coaching = 'Assist dormant users with PIN/app access and book concrete callback times when customers are busy.';
      if (agRepeated.length > 0) {
        coaching = 'Check call logs before dialing to prevent repeat calls and place frustrated contacts on a 72-hour cooldown.';
      } else if (convRate >= 45) {
        coaching = 'Strong customer persuasion—follow up on promised deposits so accounts drop below 30 dormant days.';
      } else if (agCalled < agRecords.length * 0.35 && agRecords.length > 0) {
        coaching = `Increase daily calling pace to reach the remaining ${agRecords.length - agCalled} uncalled customers.`;
      }

      return {
        agentName: ag.name,
        branch: ag.branch || agRecords[0]?.areaOfReg || 'Headquarters',
        totalAssigned: agRecords.length,
        callsMade: agCalled,
        conversions: agYes,
        rejections: agNo,
        conversionRate: convRate,
        customerSentimentSummary: sentiment,
        tailoredCoachingAdvice: coaching,
      };
    })
    .filter(a => a.totalAssigned > 0 || a.callsMade > 0);

  // Decision Summary & Sentiment Percentages grounded in real counts
  const decidedTotal = Math.max(1, yesDecisionRecords.length + noDecisionRecords.length);
  const decisionSummary: AiDecisionSummary = {
    yesCount: yesDecisionRecords.length,
    verifiedSuccessCount: successRecords.length,
    agreedInProgressCount: agreedInProgressRecords.length,
    noCount: noDecisionRecords.length,
    callbackCount: apptCount,
    unreachableCount: unreachableLogRecords.length,
    uncalledCount: uncalledRecords.length,
    yesPercentOfDecided:
      yesDecisionRecords.length + noDecisionRecords.length > 0
        ? Math.round((yesDecisionRecords.length / decidedTotal) * 100)
        : 0,
    noPercentOfDecided:
      yesDecisionRecords.length + noDecisionRecords.length > 0
        ? Math.max(0, 100 - Math.round((yesDecisionRecords.length / decidedTotal) * 100))
        : 0,
  };

  const sentimentDenom = Math.max(1, calledRecords.length);
  const posPct = calledRecords.length > 0 ? Math.min(100, Math.round((yesDecisionRecords.length / sentimentDenom) * 100)) : 0;
  const negPct = calledRecords.length > 0 ? Math.min(100 - posPct, Math.round((noDecisionRecords.length / sentimentDenom) * 100)) : 0;
  const neuPct = Math.max(0, 100 - (posPct + negPct));

  const totalComplaintsCount = activeComplaints.reduce((s, c) => s + c.records.length, 0);
  const fbDenom = Math.max(1, totalComplaintsCount + yesDecisionRecords.length + noDecisionRecords.length + apptCount);
  const complaintsPct = Math.round((totalComplaintsCount / fbDenom) * 100);
  const apprecPct = Math.round((yesDecisionRecords.length / fbDenom) * 100);
  const rejectPct = Math.round((noDecisionRecords.length / fbDenom) * 100);
  const apptPct = Math.max(0, 100 - (complaintsPct + apprecPct + rejectPct));

  let dynamicExecutiveSummary = '';
  if (records.length === 0) {
    dynamicExecutiveSummary = 'No customer records are currently loaded in the selected scope. Upload an Excel sheet to begin analysis.';
  } else if (calledRecords.length === 0) {
    dynamicExecutiveSummary = `All ${records.length} customer records in this selection (${datePeriod || 'All Time'}) are currently Uncalled. No customer complaints, positive commitments, or objections have been recorded yet. Assign and dial these leads to begin capturing customer feedback.`;
  } else {
    dynamicExecutiveSummary = `Analyzed ${records.length} customer records for ${datePeriod || 'All Time'}: ${calledRecords.length} customers contacted (${uncalledRecords.length} uncalled remaining). Across spoken customer interactions and ${recordsWithNotes.length} written feedback notes, ${yesDecisionRecords.length} customer(s) responded positively (${successRecords.length} verified active <30d dormant + ${agreedInProgressRecords.length} agreed to reactivate/transact), ${noDecisionRecords.length} customer(s) reported objections or dormancy barriers, ${apptCount} scheduled callbacks were booked, and ${unreachableLogRecords.length} call(s) were unanswered/switched off.`;
  }

  const strategicAdvices: AiStrategicObservation[] = [];
  if (calledRecords.length === 0) {
    strategicAdvices.push(
      {
        title: 'Start Outbound Calling on Uncalled Excel Roster',
        priority: 'IMMEDIATE',
        description: `Distribute and dial the ${records.length} uncalled customer records during peak morning reachability hours (9:00 AM – 12:30 PM).`,
        expectedImpact: 'Establishes initial customer contact and uncovers dormancy reasons across branches.',
      },
      {
        title: 'Log Exact Customer Feedback Notes on Every Call',
        priority: 'OPERATIONAL',
        description: 'Instruct agents to write clear Af-Soomaali or English notes explaining whether the customer agreed to transact, needed a PIN reset, or declined.',
        expectedImpact: 'Enables accurate AI translation, decision tracking, and auto-Success verification on re-upload.',
      }
    );
  } else {
    if (appPinRecords.length > 0 || simLostRecords.length > 0) {
      strategicAdvices.push({
        title: 'Fast-Track PIN Resets & Account Unlock Support',
        priority: 'IMMEDIATE',
        description: `Assist the ${appPinRecords.length + simLostRecords.length} customer(s) blocked by forgotten PINs, locked apps, or lost SIM cards so they can immediately resume transacting.`,
        expectedImpact: 'Directly converts blocked dormant users into active accounts (<30 days dormant).',
      });
    }
    if (agreedInProgressRecords.length > 0) {
      strategicAdvices.push({
        title: 'Follow Up on Customers Who Promised to Reactivate',
        priority: 'IMMEDIATE',
        description: `${agreedInProgressRecords.length} contacted customer(s) agreed to deposit or resume using MyCash. Send a friendly reminder and verify their <30d dormancy on the next Excel re-upload for automatic Success promotion.`,
        expectedImpact: 'Turns verbal "Yes" commitments into verified active accounts.',
      });
    }
    if (competitorRecords.length > 0 || feeRecords.length > 0) {
      strategicAdvices.push({
        title: 'Equip Agents With Zero-Fee Secondary Wallet Pitch',
        priority: 'STRATEGIC',
        description: 'Coach agents to position MyCash as a cost-saving banking & merchant transfer account alongside EVC/Zaad/Sahal rather than asking customers to abandon existing wallets.',
        expectedImpact: 'Reduces competitor-loyalty and fee objections by 20–30%.',
      });
    }
    if (apptCount > 0) {
      strategicAdvices.push({
        title: 'Complete All Scheduled Customer Callbacks On Time',
        priority: 'OPERATIONAL',
        description: `Ensure agents call all ${apptCount} scheduled callback customers within 10 minutes of their agreed appointment time.`,
        expectedImpact: 'High conversion rate on warm prospects who requested a specific callback window.',
      });
    }
    if (strategicAdvices.length === 0) {
      strategicAdvices.push({
        title: 'Accelerate Daily Calling Pace & Re-Attempt Unanswered Numbers',
        priority: 'OPERATIONAL',
        description: 'Re-dial unanswered/switched-off numbers at alternate times of day (late afternoon) and complete remaining uncalled leads.',
        expectedImpact: 'Improves overall contact rate and active customer conversions.',
      });
    }
  }

  return {
    reportTitle: 'AI Customer Feedback & Tele-Sales Intelligence Report',
    generatedAt: new Date().toISOString(),
    datePeriod: datePeriod || 'All Time (Full Historical Dataset)',
    language: 'english',
    engineUsed: 'Analytical Ground-Truth Engine',
    aiEngineStatus: 'fallback',
    statusMessage: 'Processed using linguistic Somali-to-English analytical engine grounded strictly in Excel records.',
    decisionSummary,
    noteTranslations,
    executiveSummary: dynamicExecutiveSummary,
    totalRecordsAnalyzed: records.length,
    branchesCovered: Array.from(new Set(branches.map(b => b.name))),
    agentsCovered: Array.from(new Set(effectiveAgents.map(a => a.name))),
    feedbackBreakdown: {
      complaintsPercent: complaintsPct,
      appreciationsPercent: apprecPct,
      rejectionsPercent: rejectPct,
      inquiriesAndFollowupsPercent: apptPct,
    },
    sentimentBreakdown: {
      positivePercent: posPct,
      neutralPercent: neuPct,
      negativePercent: negPct,
    },
    topComplaints,
    topAppreciations,
    rejectionAnalysis,
    appointmentInsights,
    branchPerformances,
    agentSummaries,
    strategicOvercomeAdvices: strategicAdvices,
  };
}

// ============================================================================
// LIVE GEMINI 4 INTELLIGENCE & SOMALI TRANSLATION ORCHESTRATOR
// ============================================================================

export async function runAiIntelligenceAnalysis(params: {
  records: CustomerRecord[];
  branches: BranchInfo[];
  agents: User[];
  scopeName: string;
  datePeriod?: string;
}): Promise<AiAnalysisResult> {
  const { records, branches, agents, scopeName, datePeriod } = params;

  // 1. Compute factual ground-truth baseline first
  const baseline = generateOfflineHeuristicAnalysis(records, branches, agents, datePeriod);

  const notesWithText = records.filter(r => r.feedbackNote && r.feedbackNote.trim().length > 0);
  const calledRecords = records.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled'));

  // If zero written feedback notes exist in the Excel, return exact ground-truth immediately (zero hallucinations!)
  if (notesWithText.length === 0) {
    baseline.aiEngineStatus = 'connected';
    baseline.engineUsed = 'Verified Excel Data Engine (0 Written Notes)';
    baseline.statusMessage =
      calledRecords.length === 0
        ? `All ${records.length} Excel records are Uncalled. Zero customer feedback notes to translate yet.`
        : `Analyzed ${records.length} Excel records (${calledRecords.length} called). Agents have not entered written feedback notes yet.`;
    return baseline;
  }

  // Group all unique customer feedback notes (up to 120 unique patterns!) with rich Excel metadata
  const noteGroupMap = new Map<
    string,
    {
      count: number;
      statuses: Set<string>;
      branches: Set<string>;
      agents: Set<string>;
      totalDormantDays: number;
      totalTransactions: number;
      hasAppointment: boolean;
    }
  >();

  notesWithText.forEach(r => {
    const cleanNote = r.feedbackNote.trim();
    const existing = noteGroupMap.get(cleanNote);
    if (existing) {
      existing.count += 1;
      if (r.status) existing.statuses.add(r.status);
      if (r.areaOfReg) existing.branches.add(r.areaOfReg);
      if (r.assignedAgentName) existing.agents.add(r.assignedAgentName);
      existing.totalDormantDays += Number(r.dormantDays || 0);
      existing.totalTransactions += Number(r.totalTransactions || 0);
      if (isAppointmentRecord(r)) existing.hasAppointment = true;
    } else {
      noteGroupMap.set(cleanNote, {
        count: 1,
        statuses: new Set(r.status ? [r.status] : []),
        branches: new Set(r.areaOfReg ? [r.areaOfReg] : []),
        agents: new Set(r.assignedAgentName ? [r.assignedAgentName] : []),
        totalDormantDays: Number(r.dormantDays || 0),
        totalTransactions: Number(r.totalTransactions || 0),
        hasAppointment: isAppointmentRecord(r),
      });
    }
  });

  const uniqueNotesPayload = Array.from(noteGroupMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 120)
    .map(([note, meta], idx) => ({
      id: idx + 1,
      customerCount: meta.count,
      statuses: Array.from(meta.statuses),
      branches: Array.from(meta.branches),
      agents: Array.from(meta.agents),
      avgDormantDays: Math.round(meta.totalDormantDays / meta.count),
      avgTransactions: Math.round(meta.totalTransactions / meta.count),
      hasCallbackAppointment: meta.hasAppointment,
      rawFeedbackNote: note,
    }));

  const systemInstruction = `You are an elite Bilingual Somali-to-English Banking & Tele-Sales Intelligence Analyst for MyCash Bank in Somalia.
You possess native-level mastery of all Af-Soomaali dialects (Northern/Maxaa-tiri, Mogadishu/Benadiri, Puntland, Somaliland, Southern/Maay), Arabic loanwords (e.g., "Insha Allah", "Masha Allah"), and colloquial mixed Somali-English call-center shorthand written by tele-sales agents in Excel sheets.

CRITICAL DOMAIN & TRANSLATION RULES:
1. PERFECT, CONTEXTUAL ENGLISH TRANSLATION OF EVERY NOTE ("noteTranslations"):
   - Translate EVERY "rawFeedbackNote" into natural, idiomatic, accurate English that captures 100% of what the agent/customer wrote (specific reasons, days, amounts, PIN/SIM/app issues, competitor wallets like EVC Plus/Zaad/Sahal/e-Dahab, travel/rural location, promises to deposit, or unanswered call logs).
   - Pay strict attention to Somali negation ("ma", "uma", "kama", "kuma", "aan", "diiday", "maya", "waayay", "la'aan"): NEVER confuse "ma fiicna" (not good) with "fiican" (good), or "ma rabo" (does not want) with "rabaa" (wants), or "ma isticmaalo" (does not use) with "waan isticmaalaa" (actively uses).
   - Distinguish agent third-person reporting ("Macmiilku wuxuu sheegay..." = "The customer stated...") from direct quotes accurately.
   - Set "detectedLanguage" accurately to "Af-Soomaali", "English", or "Mixed". If the note is ALREADY written in English, keep its exact meaning in clean English.

2. HOW MYCASH STATUSES & THE "DECISIONS (YES vs NO)" TAB WORK (CRITICAL):
   - In the MyCash portal, calling agents CANNOT manually set a customer's status to "Success" during a phone call ("Success" is only auto-assigned later upon Excel re-upload when dormant_days drops below 30).
   - Therefore, customers who SAID YES during the call (agreed to reactivate their dormant account, promised to deposit/transact, praised MyCash, or confirmed active usage) will usually have status "In-progress" (or "Success"). You MUST include all such positive/affirmative customer feedback in "topAppreciations" ("Why Customers Said Yes / Agreed to Reactivate")!
   - Conversely, customers who SAID NO, hesitated, or explained why their account is dormant (using EVC/Zaad/Sahal, no money right now, forgot PIN / locked app, lost SIM card, high fees, wrong phone number, abroad/rural without internet, busy, or refused) may have status "Rejected", "In-progress", or "Not Available". Group all real customer objections & dormancy barriers into "rejectionAnalysis" ("Why Customers Declined / Objections & Barriers") with practical, empathetic overcoming scripts for agents!
   - DO NOT put pure unanswered phone call logs ("telefoonka waa dansan yahay", "ma qabanayo", "no answer", "switched off") into "topAppreciations" or "topComplaints". Only mention unanswered calls in "rejectionAnalysis" if there are zero spoken objections, or summarize them in "executiveSummary".

3. ZERO HALLUCINATIONS:
   - ONLY report themes, complaints, appreciations, and objections that actually appear in the provided "rawFeedbackNote" list.
   - If zero notes describe product/service complaints, return an empty array [] for "topComplaints".
   - If zero notes show positive/Yes agreement AND verified Success count is 0, return an empty array [] for "topAppreciations".
   - If zero notes show objections/barriers AND Rejected count is 0, return an empty array [] for "rejectionAnalysis".
   - Every "original" field inside "bilingualQuotes" MUST be copied verbatim from "rawFeedbackNote" in the dataset—NEVER invent Somali or English quotes.
   - Ensure all "percentage" values are integers between 0 and 100 (summing to ~100 across each list).`;

  const prompt = `Analyze the following real MyCash Excel dataset and Af-Soomaali / English customer feedback notes:

DATASET SUMMARY:
- Scope: ${scopeName}
- Period: ${datePeriod || 'All Time'}
- Total Excel Records: ${records.length}
- Contacted / Called Records: ${calledRecords.length}
- Uncalled Records: ${records.length - calledRecords.length}
- Verified Auto-Success (<30d Dormant): ${baseline.decisionSummary?.verifiedSuccessCount || 0}
- Rejected Status Count: ${records.filter(r => r.status === 'Rejected').length}
- In-Progress Status Count: ${records.filter(r => r.status === 'In-progress').length}
- Not Available Status Count: ${records.filter(r => r.status === 'Not Available').length}
- Scheduled Callback Appointments: ${baseline.appointmentInsights.totalAppointments}
- Records With Written Feedback Notes: ${notesWithText.length} (${uniqueNotesPayload.length} unique note patterns)

AGENTS IN SCOPE:
${JSON.stringify(
  baseline.agentSummaries.map(a => ({
    agentName: a.agentName,
    branch: a.branch,
    assigned: a.totalAssigned,
    called: a.callsMade,
  })),
  null,
  2
)}

UNIQUE CUSTOMER FEEDBACK NOTES FROM EXCEL (${uniqueNotesPayload.length} patterns):
${JSON.stringify(uniqueNotesPayload, null, 2)}

Return the complete structured JSON analysis in clear, simple, executive English, with accurate "noteTranslations" and verbatim "bilingualQuotes".`;

  try {
    const { data: aiData, engine } = await executeGeminiAnalysisPrompt(prompt, systemInstruction);

    // 1. Build authoritative translation dictionary from Gemini's noteTranslations + baseline fallback
    const mergedTranslations: Record<string, BilingualQuote> = { ...(baseline.noteTranslations || {}) };

    if (Array.isArray(aiData.noteTranslations)) {
      for (const nt of aiData.noteTranslations) {
        if (nt && nt.originalNote && nt.englishTranslation) {
          const origClean = String(nt.originalNote).trim().replace(/^["']+|["']+$/g, '').trim();
          const langRaw = String(nt.detectedLanguage || '');
          const lang: 'Af-Soomaali' | 'English' | 'Mixed' =
            langRaw === 'English' ? 'English' : langRaw === 'Mixed' ? 'Mixed' : detectNoteLanguage(origClean);

          const entry: BilingualQuote = {
            original: origClean,
            english: String(nt.englishTranslation).trim().replace(/^["']+|["']+$/g, '').trim(),
            language: lang,
          };
          mergedTranslations[origClean] = entry;
          mergedTranslations[origClean.toLowerCase()] = entry;
        }
      }
    }

    // Helper to validate & hydrate bilingual quotes strictly against real notes in the Excel
    const validRealNotesSet = new Set(notesWithText.map(r => r.feedbackNote.trim().toLowerCase()));

    const hydrateQuotesList = (
      rawBilingual: any[] | undefined,
      rawStrings: string[] | undefined
    ): { bilingualQuotes: BilingualQuote[]; customerQuotes: string[] } => {
      const resultBilingual: BilingualQuote[] = [];
      const seen = new Set<string>();

      if (Array.isArray(rawBilingual)) {
        for (const item of rawBilingual) {
          if (!item || !item.original) continue;
          const orig = String(item.original).trim().replace(/^["']+|["']+$/g, '').trim();
          if (!orig || seen.has(orig.toLowerCase())) continue;

          // Verify quote is grounded in real Excel notes (exact or substring match)
          const origLower = orig.toLowerCase();
          const isReal =
            validRealNotesSet.has(origLower) ||
            Array.from(validRealNotesSet).some(rn => rn.includes(origLower) || origLower.includes(rn));
          if (!isReal) continue;

          seen.add(origLower);
          const mapped = mergedTranslations[origLower];
          const lang: 'Af-Soomaali' | 'English' | 'Mixed' =
            mapped?.language ||
            (item.language === 'English' ? 'English' : item.language === 'Mixed' ? 'Mixed' : detectNoteLanguage(orig));
          const eng =
            (item.english && String(item.english).trim()) ||
            mapped?.english ||
            translateSomaliQuoteToEnglish(orig);

          resultBilingual.push({
            original: orig,
            english: eng.replace(/^["']+|["']+$/g, '').trim(),
            language: lang,
          });
        }
      }

      if (resultBilingual.length === 0 && Array.isArray(rawStrings)) {
        for (const s of rawStrings) {
          const parsed = parseBilingualQuote(s, mergedTranslations);
          if (!parsed.original || seen.has(parsed.original.toLowerCase())) continue;
          seen.add(parsed.original.toLowerCase());
          resultBilingual.push(parsed);
        }
      }

      const customerQuotes = resultBilingual.map(bq =>
        bq.language === 'English' ? `"${bq.original}"` : `"${bq.original}" — (English translation: "${bq.english}")`
      );

      return { bilingualQuotes: resultBilingual, customerQuotes };
    };

    // 2. Hydrate & normalize topComplaints
    let topComplaints: AiComplaintItem[] = [];
    if (Array.isArray(aiData.topComplaints) && aiData.topComplaints.length > 0) {
      topComplaints = normalizeItemPercentages(
        aiData.topComplaints
          .filter((c: any) => c && c.issue && Number(c.count) > 0)
          .map((c: any) => {
            const { bilingualQuotes, customerQuotes } = hydrateQuotesList(c.bilingualQuotes, c.customerQuotes);
            const sev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(String(c.severity).toUpperCase())
              ? (String(c.severity).toUpperCase() as AiComplaintItem['severity'])
              : 'MEDIUM';
            return {
              issue: String(c.issue),
              category: String(c.category || 'Customer Feedback'),
              count: Number(c.count) || 1,
              percentage: Number(c.percentage) || 0,
              severity: sev,
              affectedBranches:
                Array.isArray(c.affectedBranches) && c.affectedBranches.length > 0
                  ? c.affectedBranches
                  : ['General'],
              customerQuotes,
              bilingualQuotes,
              rootCause: String(c.rootCause || ''),
              actionRecommendation: String(c.actionRecommendation || ''),
            };
          })
      );
    } else {
      topComplaints = baseline.topComplaints;
    }

    // 3. Hydrate & normalize topAppreciations ("Why Customers Said Yes")
    // NEVER wipe out AI's Yes findings when status==='Success' is 0 if customers agreed in notes!
    let topAppreciations: AiAppreciationItem[] = [];
    if (Array.isArray(aiData.topAppreciations) && aiData.topAppreciations.length > 0) {
      topAppreciations = normalizeItemPercentages(
        aiData.topAppreciations
          .filter((a: any) => a && a.theme && Number(a.count) > 0)
          .map((a: any) => {
            const { bilingualQuotes, customerQuotes } = hydrateQuotesList(a.bilingualQuotes, a.customerQuotes);
            return {
              theme: String(a.theme),
              count: Number(a.count) || 1,
              percentage: Number(a.percentage) || 0,
              convertingBranches: Array.isArray(a.convertingBranches) ? a.convertingBranches : [],
              customerQuotes,
              bilingualQuotes,
              keyDriver: String(a.keyDriver || ''),
            };
          })
      );
    }
    if (topAppreciations.length === 0 && baseline.topAppreciations.length > 0) {
      topAppreciations = baseline.topAppreciations;
    }

    // 4. Hydrate & normalize rejectionAnalysis ("Why Customers Declined / Barriers")
    let rejectionAnalysis: AiRejectionItem[] = [];
    if (Array.isArray(aiData.rejectionAnalysis) && aiData.rejectionAnalysis.length > 0) {
      rejectionAnalysis = normalizeItemPercentages(
        aiData.rejectionAnalysis
          .filter((r: any) => r && r.reason && Number(r.count) > 0)
          .map((r: any) => {
            const { bilingualQuotes, customerQuotes } = hydrateQuotesList(r.bilingualQuotes, r.customerQuotes);
            return {
              reason: String(r.reason),
              count: Number(r.count) || 1,
              percentage: Number(r.percentage) || 0,
              affectedBranches: Array.isArray(r.affectedBranches) ? r.affectedBranches : [],
              customerQuotes,
              bilingualQuotes,
              customerExplanation: String(r.customerExplanation || ''),
              overcomingScript: String(r.overcomingScript || ''),
            };
          })
      );
    }
    if (rejectionAnalysis.length === 0 && baseline.rejectionAnalysis.length > 0) {
      rejectionAnalysis = baseline.rejectionAnalysis;
    }

    // 5. Recompute exact Yes / No decision summary counts using Gemini's per-note classifications + status ground truth
    const aiNoteDecisionMap = new Map<string, string>();
    if (Array.isArray(aiData.noteTranslations)) {
      for (const nt of aiData.noteTranslations) {
        if (nt?.originalNote && nt?.decisionCategory) {
          aiNoteDecisionMap.set(String(nt.originalNote).trim().toLowerCase(), String(nt.decisionCategory).toUpperCase());
        }
      }
    }

    let yesCount = 0;
    let agreedInProgressCount = 0;
    let noCount = 0;
    let unreachableCount = 0;

    records.forEach(r => {
      if (r.status === 'Success') {
        yesCount++;
        return;
      }
      if (r.status === 'Rejected') {
        noCount++;
        return;
      }
      const noteClean = (r.feedbackNote || '').trim().toLowerCase();
      const aiCat = noteClean ? aiNoteDecisionMap.get(noteClean) : undefined;

      if (aiCat === 'YES_POSITIVE') {
        yesCount++;
        agreedInProgressCount++;
      } else if (aiCat === 'NO_OBJECTION' || aiCat === 'COMPLAINT') {
        noCount++;
      } else if (aiCat === 'UNREACHABLE') {
        unreachableCount++;
      } else {
        const fallbackPol = classifyRecordDecision(r);
        if (fallbackPol === 'YES_DECISION') {
          yesCount++;
          agreedInProgressCount++;
        } else if (fallbackPol === 'NO_DECISION') {
          noCount++;
        } else if (fallbackPol === 'UNREACHABLE_LOG') {
          unreachableCount++;
        }
      }
    });

    const decidedSum = Math.max(1, yesCount + noCount);
    const updatedDecisionSummary: AiDecisionSummary = {
      yesCount,
      verifiedSuccessCount: baseline.decisionSummary?.verifiedSuccessCount || 0,
      agreedInProgressCount,
      noCount,
      callbackCount: baseline.appointmentInsights.totalAppointments,
      unreachableCount,
      uncalledCount: records.length - calledRecords.length,
      yesPercentOfDecided: yesCount + noCount > 0 ? Math.round((yesCount / decidedSum) * 100) : 0,
      noPercentOfDecided: yesCount + noCount > 0 ? Math.max(0, 100 - Math.round((yesCount / decidedSum) * 100)) : 0,
    };

    // Update sentiment & feedback breakdown percentages with Gemini-enhanced counts
    const sentDenom = Math.max(1, calledRecords.length);
    const posPct = calledRecords.length > 0 ? Math.min(100, Math.round((yesCount / sentDenom) * 100)) : 0;
    const negPct = calledRecords.length > 0 ? Math.min(100 - posPct, Math.round((noCount / sentDenom) * 100)) : 0;
    const neuPct = Math.max(0, 100 - (posPct + negPct));

    const complaintMentions = topComplaints.reduce((s, c) => s + c.count, 0);
    const fbTotal = Math.max(1, complaintMentions + yesCount + noCount + baseline.appointmentInsights.totalAppointments);
    const updatedFeedbackBreakdown = {
      complaintsPercent: Math.round((complaintMentions / fbTotal) * 100),
      appreciationsPercent: Math.round((yesCount / fbTotal) * 100),
      rejectionsPercent: Math.round((noCount / fbTotal) * 100),
      inquiriesAndFollowupsPercent: Math.max(
        0,
        100 -
          (Math.round((complaintMentions / fbTotal) * 100) +
            Math.round((yesCount / fbTotal) * 100) +
            Math.round((noCount / fbTotal) * 100))
      ),
    };

    // 6. Hydrate Appointments, Branches, and Agents with Gemini's exact translations & coaching
    const updatedAppointments: AiAppointmentDetail[] = (baseline.appointmentInsights.sampleAppointments || []).map(appt => {
      const raw = records.find(
        r => r.customerName === appt.customerName && (r.phoneNumber === appt.phoneNumber || !appt.phoneNumber)
      )?.feedbackNote;
      if (raw && raw.trim()) {
        const bq = parseBilingualQuote(raw.trim(), mergedTranslations);
        return {
          ...appt,
          bilingualNote: bq,
          feedbackNote: formatQuoteWithTranslation(raw.trim(), mergedTranslations),
        };
      }
      return appt;
    });

    const updatedAgents: AiAgentPerformanceItem[] = baseline.agentSummaries.map(ag => {
      const aiCoach = Array.isArray(aiData.agentCoachingInsights)
        ? aiData.agentCoachingInsights.find(
            (c: any) =>
              c?.agentName &&
              (String(c.agentName).toLowerCase().trim() === ag.agentName.toLowerCase().trim() ||
                String(c.agentName).toLowerCase().includes(ag.agentName.toLowerCase().trim()) ||
                ag.agentName.toLowerCase().includes(String(c.agentName).toLowerCase().trim()))
          )
        : undefined;

      // Recalculate agent's yes/no using Gemini-refined note map
      const agRecs = records.filter(r => isRecordAssignedToAgent(r, { id: '', name: ag.agentName, email: '', role: 'TEAM_MEMBER', branch: ag.branch, active: true }));
      let agYes = 0;
      let agNo = 0;
      agRecs.forEach(r => {
        if (r.status === 'Success') agYes++;
        else if (r.status === 'Rejected') agNo++;
        else {
          const nc = (r.feedbackNote || '').trim().toLowerCase();
          const cat = nc ? aiNoteDecisionMap.get(nc) : undefined;
          if (cat === 'YES_POSITIVE') agYes++;
          else if (cat === 'NO_OBJECTION' || cat === 'COMPLAINT') agNo++;
        }
      });

      return {
        ...ag,
        conversions: agYes,
        rejections: agNo,
        conversionRate: ag.callsMade > 0 ? Math.round((agYes / ag.callsMade) * 100) : 0,
        customerSentimentSummary: aiCoach?.customerSentimentSummary || ag.customerSentimentSummary,
        tailoredCoachingAdvice: aiCoach?.tailoredCoachingAdvice || ag.tailoredCoachingAdvice,
      };
    });

    const updatedBranches: AiBranchPerformanceItem[] = baseline.branchPerformances.map(bp => {
      const bObj = branches.find(b => b.name === bp.branchName) || bp.branchName;
      const bRecs = records.filter(r => isRecordInBranch(r, bObj));
      const firstNote = bRecs.map(r => (r.feedbackNote || '').trim()).find(n => n.length > 0 && !isUnreachableCallLogNote(n));
      let dom = bp.dominantComplaint;
      if (firstNote) {
        const bq = parseBilingualQuote(firstNote, mergedTranslations);
        dom = bq.language === 'English' ? bq.original : `"${bq.original}" (${bq.english})`;
      }
      return {
        ...bp,
        dominantComplaint: dom,
      };
    });

    const strategicOvercomeAdvices: AiStrategicObservation[] =
      Array.isArray(aiData.strategicOvercomeAdvices) && aiData.strategicOvercomeAdvices.length > 0
        ? aiData.strategicOvercomeAdvices.map((s: any) => ({
            title: String(s.title || 'Operational Action'),
            priority: ['IMMEDIATE', 'STRATEGIC', 'OPERATIONAL'].includes(String(s.priority).toUpperCase())
              ? (String(s.priority).toUpperCase() as AiStrategicObservation['priority'])
              : 'OPERATIONAL',
            description: String(s.description || ''),
            expectedImpact: String(s.expectedImpact || ''),
          }))
        : baseline.strategicOvercomeAdvices;

    return {
      reportTitle: 'AI Customer Feedback & Tele-Sales Intelligence Report',
      generatedAt: new Date().toISOString(),
      datePeriod: datePeriod || 'All Time',
      language: 'english',
      engineUsed: engine,
      aiEngineStatus: 'connected',
      statusMessage: `Connected to ${engine} • Native Somali-to-English Translation & Excel Decision Intelligence`,
      decisionSummary: updatedDecisionSummary,
      noteTranslations: mergedTranslations,
      executiveSummary:
        aiData.executiveSummary && String(aiData.executiveSummary).trim().length > 20
          ? String(aiData.executiveSummary).trim()
          : baseline.executiveSummary,
      totalRecordsAnalyzed: records.length,
      branchesCovered: baseline.branchesCovered,
      agentsCovered: baseline.agentsCovered,
      feedbackBreakdown: updatedFeedbackBreakdown,
      sentimentBreakdown: {
        positivePercent: posPct,
        neutralPercent: neuPct,
        negativePercent: negPct,
      },
      topComplaints,
      topAppreciations,
      rejectionAnalysis,
      appointmentInsights: {
        totalAppointments: baseline.appointmentInsights.totalAppointments,
        appointmentRate: baseline.appointmentInsights.appointmentRate,
        keyObservations: aiData.appointmentInsights?.keyObservations || baseline.appointmentInsights.keyObservations,
        actionableFollowupAdvice:
          aiData.appointmentInsights?.actionableFollowupAdvice || baseline.appointmentInsights.actionableFollowupAdvice,
        sampleAppointments: updatedAppointments,
      },
      branchPerformances: updatedBranches,
      agentSummaries: updatedAgents,
      strategicOvercomeAdvices,
    };
  } catch (error: any) {
    console.warn('[Gemini AI] Falling back to linguistic Somali-to-English ground-truth engine:', error?.message || error);
    baseline.aiEngineStatus = 'fallback';
    baseline.statusMessage = `Ground-Truth Somali-English Engine Active (${error?.message || 'Offline mode'})`;
    return baseline;
  }
}

// ============================================================================
// WHATSAPP SMS TEMPLATE GENERATOR
// ============================================================================

export interface GeneratedSmsTemplateOption {
  id: string;
  title: string;
  language: 'SOMALI' | 'ENGLISH' | 'BILINGUAL';
  body: string;
  recommendedAudience: string;
  rationale: string;
}

export interface GenerateWhatsAppTemplateParams {
  purpose: 'DORMANT_90' | 'STATUS_FOLLOWUP' | 'APPOINTMENT_REMINDER' | 'PROMOTIONAL' | 'CUSTOM';
  targetAudience: string;
  language: 'SOMALI' | 'ENGLISH' | 'BILINGUAL';
  tone: 'FRIENDLY' | 'BANKING_PROFESSIONAL' | 'URGENT_REACTIVATION';
  selectedStatuses?: string[];
  minDormantDays?: number;
  customInstructions?: string;
}

export async function generateWhatsAppSmsTemplate(
  params: GenerateWhatsAppTemplateParams
): Promise<GeneratedSmsTemplateOption[]> {
  const fallbackTemplates: GeneratedSmsTemplateOption[] = [
    {
      id: 'tmpl-som-1',
      title: params.purpose === 'DORMANT_90' ? 'Dib U Hawlgelinta Akoonka (Somali)' : 'Ku soo Dhawoow MyCash (Somali)',
      language: 'SOMALI',
      body:
        params.purpose === 'DORMANT_90'
          ? 'Asc {{customerName}}, muddo {{dormantDays}} maalmood ah ayaan ku waynay! Akoonkaaga MyCash wuxuu diyaar u yahay dirista, qaadashada iyo lacag-dhigashada lacag la’aan. Ku soo noqo laantaada {{branch}} ama kala xiriir WhatsApp-ka wixii caawimaad ah.'
          : params.selectedStatuses?.includes('Appointments')
          ? 'Asc {{customerName}}, waxaan ku xusuusinaynaa ballantaadii ku saabsanayd MyCash Bank. Fadlan la soco in kooxdayada laanta {{branch}} ay diyaar kuu yihiin. Haddii aad rabto in ballanta la beddelo noogu soo jawaab halkan.'
          : params.selectedStatuses?.includes('No Answer')
          ? 'Asc {{customerName}}, waxaan isku daynay inaan kugu soo wacno lambarkaaga {{phoneNumber}} balse waan ku weynay. MyCash waxay kuu haysaa adeegyo maaliyadeed oo casri ah. Noo soo dir fariin WhatsApp si aan kuugu soo wacno waqti kugu habboon.'
          : 'Asc {{customerName}}, mahadsanid inaad dooratay MyCash Bank. Laantaada {{branch}} waxay diyaar kuula tahay adeeg hufan iyo fududeyn joogto ah.',
      recommendedAudience: params.targetAudience,
      rationale: 'Direct, polite, authentic Somali dialect tailored for MyCash banking customers.',
    },
    {
      id: 'tmpl-eng-1',
      title:
        params.purpose === 'DORMANT_90'
          ? 'Account Reactivation & Special Benefits (English)'
          : 'Follow-up & Welcome Notice (English)',
      language: 'ENGLISH',
      body:
        params.purpose === 'DORMANT_90'
          ? 'Dear {{customerName}}, we noticed your MyCash account has been inactive for {{dormantDays}} days. Your account is active and ready for zero-fee transfers and merchant payments. Visit our {{branch}} branch or reply to this WhatsApp message for instant assistance.'
          : params.selectedStatuses?.includes('Appointments')
          ? 'Dear {{customerName}}, this is a friendly reminder regarding your scheduled appointment with MyCash Bank. Our representative at the {{branch}} branch looks forward to assisting you. Reply here if you need to reschedule.'
          : params.selectedStatuses?.includes('No Answer')
          ? 'Hello {{customerName}}, our team from MyCash tried reaching you today at {{phoneNumber}} regarding your account benefits. We would love to connect at your convenience—simply reply to this WhatsApp message!'
          : 'Dear {{customerName}}, thank you for being a valued customer with MyCash Bank. For fast transfers, bill payments, and support, our {{branch}} team is always ready.',
      recommendedAudience: params.targetAudience,
      rationale: 'Professional English banking phrasing with clear call-to-action.',
    },
    {
      id: 'tmpl-bil-1',
      title: 'Bilingual Customer Engagement (Af-Soomaali & English)',
      language: 'BILINGUAL',
      body:
        params.purpose === 'DORMANT_90'
          ? 'Asc {{customerName}}, muddo {{dormantDays}} maalmood ah ayaan ku weynay! Akoonkaaga MyCash wuxuu diyaar u yahay adeegyada oo dhan.\n\nDear {{customerName}}, reactivate your MyCash account today for fast, seamless transactions. Visit {{branch}} or reply here.'
          : 'Asc {{customerName}}, waxaan kugu soo wacnay laanta {{branch}}. We missed you earlier on {{phoneNumber}}. Fadlan noogu soo jawaab WhatsApp-ka si aan kuugu caawinno. Reply here anytime!',
      recommendedAudience: params.targetAudience,
      rationale: 'Maximizes customer comprehension across both Somali and English speakers.',
    },
  ];

  const prompt = `You are an expert financial services copywriter and customer retention strategist for "MyCash" (a leading mobile money and digital banking service in Somalia).
Generate 3 distinct, high-converting WhatsApp SMS message templates for the following campaign:

Campaign Goal: ${params.purpose}
Target Audience: ${params.targetAudience}
Statuses: ${(params.selectedStatuses || []).join(', ') || 'General'}
Dormant Threshold: ${params.minDormantDays || 90} days
Requested Language: ${params.language}
Tone of Voice: ${params.tone}
${params.customInstructions ? `Custom Guidance: ${params.customInstructions}` : ''}

CRITICAL RULES:
1. Incorporate dynamic placeholders where appropriate: {{customerName}}, {{phoneNumber}}, {{branch}}, {{dormantDays}}, {{status}}.
2. Keep each message under 320 characters for high WhatsApp readability.
3. If language is SOMALI or BILINGUAL, write authentic, natural Somali spoken in Mogadishu, Hargeisa, Garowe, and diaspora banking.
4. Output strict JSON array with NO Markdown fences:
[
  {
    "id": "ai-opt-1",
    "title": "Short title describing option 1",
    "language": "${params.language}",
    "body": "Exact WhatsApp message text with {{placeholders}}",
    "recommendedAudience": "${params.targetAudience}",
    "rationale": "Why this message converts"
  }
]`;

  try {
    const resp = await fetch('/api/ai-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        useAnalysisSchema: false,
        candidateModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
      }),
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Gemini AI] generateWhatsAppSmsTemplate failed, using fallback templates:', err);
  }

  return fallbackTemplates;
}
