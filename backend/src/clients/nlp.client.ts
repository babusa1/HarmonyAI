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
