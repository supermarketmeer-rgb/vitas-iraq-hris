import { analyzeOdometerWithAzure } from './apiSync';

export interface OCRProcessResult {
  rawText: string;
  extractedNumber: number;
  confidence: number;
  engine: 'Azure Vision';
  processingTimeMs: number;
  preprocessedPreviewUrl?: string;
  stepsApplied: string[];
  requiresManualReview?: boolean;
  validationWarning?: string;
}

export async function performOdometerOCR(
  imageSrc: string,
  expectedMinReading: number = 0,
  _engine: 'Azure Vision' = 'Azure Vision',
  tripId?: string
): Promise<OCRProcessResult> {
  if (!tripId) throw new Error('Trip is required for Azure OCR.');

  const startedAt = performance.now();
  const result = await analyzeOdometerWithAzure({
    trip_id: tripId,
    image_data: imageSrc,
    expected_min: expectedMinReading,
  });

  if (!result.success || !result.data) {
    throw new Error(result.message || 'Azure Vision could not read the odometer.');
  }

  return {
    rawText: result.data.raw_text,
    extractedNumber: Number(result.data.extracted_number),
    confidence: Number(result.data.confidence),
    engine: 'Azure Vision',
    processingTimeMs: Number(result.data.processing_time_ms || Math.round(performance.now() - startedAt)),
    stepsApplied: ['Microsoft Azure Vision Read OCR', `Model: ${result.data.model_version || 'default'}`],
    requiresManualReview: Boolean(result.data.requires_manual_review),
    validationWarning: result.data.validation_warning || undefined,
  };
}
