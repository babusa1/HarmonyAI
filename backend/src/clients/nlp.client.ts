/**
 * NLP Client - Communicates with the Python NLP Service
 */

import axios, { AxiosInstance } from 'axios';

interface SimilarityResult {
  score: number;
  semanticScore: number;
  attributeScore: number;
}

export class NLPClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NLP_SERVICE_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.post('/embed', { text });
      return response.data.embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Embedding generation failed');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.post('/embed/batch', { texts });
      return response.data.embeddings;
    } catch (error) {
      console.error('Failed to generate batch embeddings:', error);
      throw new Error('Batch embedding generation failed');
    }
  }

  /**
   * Calculate similarity between two texts
   */
  async calculateSimilarity(text1: string, text2: string): Promise<SimilarityResult> {
    try {
      const response = await this.client.post('/similarity', { text1, text2 });
      return {
        score: response.data.score,
        semanticScore: response.data.semantic_score,
        attributeScore: response.data.attribute_score
      };
    } catch (error) {
      console.error('Failed to calculate similarity:', error);
      throw new Error('Similarity calculation failed');
    }
  }

  /**
   * Find similar texts from a corpus
   */
  async findSimilar(query: string, topK: number = 5): Promise<Array<{
    id: string;
    text: string;
    score: number;
  }>> {
    try {
      const response = await this.client.post('/search', { query, top_k: topK });
      return response.data.results;
    } catch (error) {
      console.error('Failed to find similar:', error);
      throw new Error('Similarity search failed');
    }
  }

  /**
   * Parse product attributes from description
   */
  async parseAttributes(description: string): Promise<{
    brand?: string;
    sizeValue?: number;
    sizeUnit?: string;
    variant?: string;
    category?: string;
  }> {
    try {
      const response = await this.client.post('/parse', { description });
      return response.data.attributes;
    } catch (error) {
      console.error('Failed to parse attributes:', error);
      return {};
    }
  }

  /**
   * Clean and normalize product description
   */
  async cleanDescription(description: string): Promise<string> {
    try {
      const response = await this.client.post('/clean', { description });
      return response.data.cleaned;
    } catch (error) {
      console.error('Failed to clean description:', error);
      return description;
    }
  }

  /**
   * Normalize text using abbreviation expansion
   */
  async normalize(text: string, retailer?: string): Promise<{
    original: string;
    normalized: string;
    brand?: string;
    brandConfidence: number;
    categoryHint?: string;
    expansions: Array<{ from: string; to: string }>;
  }> {
    try {
      const response = await this.client.post('/normalize', { text, retailer });
      return {
        original: response.data.original,
        normalized: response.data.normalized,
        brand: response.data.brand,
        brandConfidence: response.data.brand_confidence,
        categoryHint: response.data.category_hint,
        expansions: response.data.expansions
      };
    } catch (error) {
      console.error('Failed to normalize:', error);
      return {
        original: text,
        normalized: text,
        brandConfidence: 0,
        expansions: []
      };
    }
  }

  /**
   * Normalize multiple texts in batch
   */
  async normalizeBatch(texts: string[], retailer?: string): Promise<{
    count: number;
    results: Array<{
      original: string;
      normalized: string;
      brand?: string;
      brandConfidence: number;
      categoryHint?: string;
    }>;
  }> {
    try {
      const response = await this.client.post('/normalize/batch', { texts, retailer });
      return {
        count: response.data.count,
        results: response.data.results.map((r: any) => ({
          original: r.original,
          normalized: r.normalized,
          brand: r.brand,
          brandConfidence: r.brand_confidence,
          categoryHint: r.category_hint
        }))
      };
    } catch (error) {
      console.error('Failed to normalize batch:', error);
      return {
        count: texts.length,
        results: texts.map(t => ({
          original: t,
          normalized: t,
          brandConfidence: 0
        }))
      };
    }
  }

  /**
   * Enhanced matching with normalization
   */
  async enhancedMatch(masterName: string, rawDescription: string, options?: {
    masterBrand?: string;
    masterCategory?: string;
    masterSizeValue?: number;
    masterSizeUnit?: string;
    retailer?: string;
  }): Promise<{
    normalizedDescription: string;
    semanticScore: number;
    attributeScore: number;
    normalizationBonus: number;
    finalConfidence: number;
    recommendedStatus: string;
    matchingDetails: any;
    normalizationDetails: any;
  }> {
    try {
      const response = await this.client.post('/match/enhanced', {
        master_name: masterName,
        master_brand: options?.masterBrand,
        master_category: options?.masterCategory,
        master_size_value: options?.masterSizeValue,
        master_size_unit: options?.masterSizeUnit,
        raw_description: rawDescription,
        retailer: options?.retailer,
        normalize: true
      });
      return {
        normalizedDescription: response.data.normalized_description,
        semanticScore: response.data.semantic_score,
        attributeScore: response.data.attribute_score,
        normalizationBonus: response.data.normalization_bonus,
        finalConfidence: response.data.final_confidence,
        recommendedStatus: response.data.recommended_status,
        matchingDetails: response.data.matching_details,
        normalizationDetails: response.data.normalization_details
      };
    } catch (error) {
      console.error('Failed enhanced match:', error);
      throw new Error('Enhanced match failed');
    }
  }

  /**
   * Record HITL decision for learning
   */
  async recordDecision(decision: {
    mappingId: string;
    rawDescription: string;
    masterProduct: string;
    decision: 'approved' | 'rejected';
    originalConfidence: number;
    retailer: string;
    corrections?: any;
  }): Promise<void> {
    try {
      await this.client.post('/learn/decision', {
        mapping_id: decision.mappingId,
        raw_description: decision.rawDescription,
        master_product: decision.masterProduct,
        decision: decision.decision,
        original_confidence: decision.originalConfidence,
        retailer: decision.retailer,
        corrections: decision.corrections
      });
    } catch (error) {
      console.error('Failed to record decision:', error);
      // Don't throw - learning is non-critical
    }
  }

  /**
   * Get learning stats
   */
  async getLearningStats(retailer?: string): Promise<any> {
    try {
      const url = retailer ? `/learn/stats?retailer=${retailer}` : '/learn/stats';
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to get learning stats:', error);
      return null;
    }
  }

  /**
   * Get learned abbreviation patterns
   */
  async getLearnedPatterns(minOccurrences: number = 1): Promise<Array<{
    abbreviation: string;
    expansion: string;
    occurrences: number;
    confidence: number;
    retailers: string[];
  }>> {
    try {
      const response = await this.client.get(`/learn/patterns?min_occurrences=${minOccurrences}`);
      return response.data.patterns;
    } catch (error) {
      console.error('Failed to get patterns:', error);
      return [];
    }
  }

  /**
   * Health check for NLP service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}
