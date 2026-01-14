/**
 * Analytics Service - Sales Analytics & Competitor Benchmarking
 */

import { pool } from '../database/connection.js';

interface SalesFilters {
  startDate?: string;
  endDate?: string;
  brand?: string;
  category?: string;
  retailer?: string;
  granularity: 'daily' | 'weekly' | 'monthly';
}

interface BenchmarkFilters {
  category?: string;
  ourBrand?: string;
  competitorBrand?: string;
  startDate?: string;
  endDate?: string;
}

export class AnalyticsService {
  async getDashboardStats() {
    const queries = {
      catalogCount: `SELECT COUNT(*) as count FROM manufacturer_catalog WHERE is_active = true`,
      retailerCount: `SELECT COUNT(*) as count FROM retailer_data_raw`,
      mappingStats: `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status IN ('auto_confirmed', 'verified', 'manual') THEN 1 END) as confirmed
        FROM equivalence_map
      `,
      salesSummary: `
        SELECT 
          SUM(revenue) as total_revenue,
          SUM(units_sold) as total_units,
          COUNT(DISTINCT transaction_date) as days_with_data
        FROM sales_transactions
        WHERE transaction_date >= NOW() - INTERVAL '30 days'
      `,
      sourceCount: `SELECT COUNT(*) as count FROM source_systems WHERE is_active = true`,
      recentActivity: `
        SELECT 
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
        FROM equivalence_map
      `
    };

    const results = await Promise.all([
      pool.query(queries.catalogCount),
      pool.query(queries.retailerCount),
      pool.query(queries.mappingStats),
      pool.query(queries.salesSummary),
      pool.query(queries.sourceCount),
      pool.query(queries.recentActivity)
    ]);

    return {
      catalog: {
        totalProducts: parseInt(results[0].rows[0].count)
      },
      retailer: {
        totalRecords: parseInt(results[1].rows[0].count)
      },
      mappings: {
        total: parseInt(results[2].rows[0].total),
        pending: parseInt(results[2].rows[0].pending),
        confirmed: parseInt(results[2].rows[0].confirmed),
        matchRate: results[2].rows[0].total > 0 
          ? ((results[2].rows[0].confirmed / results[2].rows[0].total) * 100).toFixed(1)
          : 0
      },
      sales: {
        last30Days: {
          revenue: parseFloat(results[3].rows[0].total_revenue) || 0,
          units: parseInt(results[3].rows[0].total_units) || 0,
          daysWithData: parseInt(results[3].rows[0].days_with_data) || 0
        }
      },
      sources: {
        total: parseInt(results[4].rows[0].count)
      },
      activity: {
        last24h: parseInt(results[5].rows[0].last_24h),
        last7d: parseInt(results[5].rows[0].last_7d)
      }
    };
  }

  async getSalesData(filters: SalesFilters) {
    const { startDate, endDate, brand, category, retailer, granularity } = filters;

    let dateFormat: string;
    switch (granularity) {
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        dateFormat = 'IYYY-IW';
        break;
      case 'monthly':
      default:
        dateFormat = 'YYYY-MM';
    }

    let whereClause = "WHERE em.status IN ('auto_confirmed', 'verified', 'manual')";
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND st.transaction_date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND st.transaction_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (brand) {
      whereClause += ` AND b.name = $${paramIndex++}`;
      params.push(brand);
    }

    if (category) {
      whereClause += ` AND c.name = $${paramIndex++}`;
      params.push(category);
    }

    if (retailer) {
      whereClause += ` AND ss.code = $${paramIndex++}`;
      params.push(retailer);
    }

    const query = `
      SELECT 
        TO_CHAR(st.transaction_date, '${dateFormat}') as period,
        b.name as brand,
        c.name as category,
        ss.name as retailer,
        em.is_competitor,
        SUM(st.revenue) as revenue,
        SUM(st.units_sold) as units,
        COUNT(DISTINCT mc.id) as product_count
      FROM sales_transactions st
      JOIN retailer_data_raw rdr ON st.raw_id = rdr.id
      JOIN equivalence_map em ON rdr.id = em.raw_id
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      JOIN source_systems ss ON st.source_system_id = ss.id
      ${whereClause}
      GROUP BY 
        TO_CHAR(st.transaction_date, '${dateFormat}'),
        b.name, c.name, ss.name, em.is_competitor
      ORDER BY period
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getCompetitorBenchmark(filters: BenchmarkFilters) {
    const { category, ourBrand, competitorBrand, startDate, endDate } = filters;

    let whereClause = "WHERE em.status IN ('auto_confirmed', 'verified', 'manual')";
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND c.name = $${paramIndex++}`;
      params.push(category);
    }

    if (startDate) {
      whereClause += ` AND st.transaction_date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND st.transaction_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    const query = `
      SELECT 
        c.name as category,
        TO_CHAR(st.transaction_date, 'YYYY-MM') as month,
        SUM(CASE WHEN em.is_competitor = false THEN st.revenue ELSE 0 END) as our_revenue,
        SUM(CASE WHEN em.is_competitor = true THEN st.revenue ELSE 0 END) as competitor_revenue,
        SUM(CASE WHEN em.is_competitor = false THEN st.units_sold ELSE 0 END) as our_units,
        SUM(CASE WHEN em.is_competitor = true THEN st.units_sold ELSE 0 END) as competitor_units,
        COUNT(DISTINCT CASE WHEN em.is_competitor = false THEN mc.id END) as our_products,
        COUNT(DISTINCT CASE WHEN em.is_competitor = true THEN mc.id END) as competitor_products
      FROM sales_transactions st
      JOIN retailer_data_raw rdr ON st.raw_id = rdr.id
      JOIN equivalence_map em ON rdr.id = em.raw_id
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      ${whereClause}
      GROUP BY c.name, TO_CHAR(st.transaction_date, 'YYYY-MM')
      ORDER BY month, c.name
    `;

    const result = await pool.query(query, params);

    // Calculate share and growth
    const processedData = result.rows.map((row, index, arr) => {
      const totalRevenue = parseFloat(row.our_revenue) + parseFloat(row.competitor_revenue);
      const ourShare = totalRevenue > 0 
        ? (parseFloat(row.our_revenue) / totalRevenue * 100).toFixed(1)
        : 0;

      // Calculate month-over-month growth
      const prevMonthRow = arr.find(r => 
        r.category === row.category && 
        this.getPreviousMonth(row.month) === r.month
      );

      let ourGrowth = null;
      let competitorGrowth = null;

      if (prevMonthRow) {
        ourGrowth = prevMonthRow.our_revenue > 0
          ? (((parseFloat(row.our_revenue) - parseFloat(prevMonthRow.our_revenue)) / parseFloat(prevMonthRow.our_revenue)) * 100).toFixed(1)
          : null;
        competitorGrowth = prevMonthRow.competitor_revenue > 0
          ? (((parseFloat(row.competitor_revenue) - parseFloat(prevMonthRow.competitor_revenue)) / parseFloat(prevMonthRow.competitor_revenue)) * 100).toFixed(1)
          : null;
      }

      return {
        ...row,
        our_revenue: parseFloat(row.our_revenue),
        competitor_revenue: parseFloat(row.competitor_revenue),
        our_units: parseInt(row.our_units),
        competitor_units: parseInt(row.competitor_units),
        our_market_share: parseFloat(ourShare),
        our_growth: ourGrowth ? parseFloat(ourGrowth) : null,
        competitor_growth: competitorGrowth ? parseFloat(competitorGrowth) : null
      };
    });

    return processedData;
  }

  async getMarketShare(filters: { category?: string; period?: string }) {
    const { category, period = 'last_12_months' } = filters;

    let dateFilter = '';
    switch (period) {
      case 'last_3_months':
        dateFilter = "AND st.transaction_date >= NOW() - INTERVAL '3 months'";
        break;
      case 'last_6_months':
        dateFilter = "AND st.transaction_date >= NOW() - INTERVAL '6 months'";
        break;
      case 'last_12_months':
      default:
        dateFilter = "AND st.transaction_date >= NOW() - INTERVAL '12 months'";
    }

    let categoryFilter = '';
    const params: any[] = [];
    if (category) {
      categoryFilter = 'AND c.name = $1';
      params.push(category);
    }

    const query = `
      SELECT 
        b.name as brand,
        c.name as category,
        em.is_competitor,
        SUM(st.revenue) as total_revenue,
        SUM(st.units_sold) as total_units
      FROM sales_transactions st
      JOIN retailer_data_raw rdr ON st.raw_id = rdr.id
      JOIN equivalence_map em ON rdr.id = em.raw_id
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      WHERE em.status IN ('auto_confirmed', 'verified', 'manual')
      ${dateFilter}
      ${categoryFilter}
      GROUP BY b.name, c.name, em.is_competitor
      ORDER BY total_revenue DESC
    `;

    const result = await pool.query(query, params);

    // Calculate market share percentages
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0);
    
    return result.rows.map(row => ({
      brand: row.brand,
      category: row.category,
      isCompetitor: row.is_competitor,
      revenue: parseFloat(row.total_revenue),
      units: parseInt(row.total_units),
      marketShare: totalRevenue > 0 
        ? ((parseFloat(row.total_revenue) / totalRevenue) * 100).toFixed(2)
        : 0
    }));
  }

  async getSalesTrends(filters: { brand?: string; category?: string; months?: number }) {
    const { brand, category, months = 12 } = filters;

    let whereClause = `
      WHERE em.status IN ('auto_confirmed', 'verified', 'manual')
      AND st.transaction_date >= NOW() - INTERVAL '${months} months'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (brand) {
      whereClause += ` AND b.name = $${paramIndex++}`;
      params.push(brand);
    }

    if (category) {
      whereClause += ` AND c.name = $${paramIndex++}`;
      params.push(category);
    }

    const query = `
      SELECT 
        TO_CHAR(st.transaction_date, 'YYYY-MM') as month,
        SUM(st.revenue) as revenue,
        SUM(st.units_sold) as units,
        AVG(st.revenue / NULLIF(st.units_sold, 0)) as avg_price
      FROM sales_transactions st
      JOIN retailer_data_raw rdr ON st.raw_id = rdr.id
      JOIN equivalence_map em ON rdr.id = em.raw_id
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      ${whereClause}
      GROUP BY TO_CHAR(st.transaction_date, 'YYYY-MM')
      ORDER BY month
    `;

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue),
      units: parseInt(row.units),
      avgPrice: row.avg_price ? parseFloat(row.avg_price).toFixed(2) : null
    }));
  }

  async getTopProducts(filters: { 
    limit?: number; 
    metric?: 'revenue' | 'units';
    category?: string;
    includeCompetitors?: boolean;
  }) {
    const { limit = 10, metric = 'revenue', category, includeCompetitors = false } = filters;

    let whereClause = "WHERE em.status IN ('auto_confirmed', 'verified', 'manual')";
    const params: any[] = [];
    let paramIndex = 1;

    if (!includeCompetitors) {
      whereClause += ' AND em.is_competitor = false';
    }

    if (category) {
      whereClause += ` AND c.name = $${paramIndex++}`;
      params.push(category);
    }

    const orderBy = metric === 'units' ? 'total_units DESC' : 'total_revenue DESC';

    const query = `
      SELECT 
        mc.id,
        mc.canonical_name as product_name,
        b.name as brand,
        c.name as category,
        em.is_competitor,
        SUM(st.revenue) as total_revenue,
        SUM(st.units_sold) as total_units,
        COUNT(DISTINCT ss.id) as retailer_count
      FROM sales_transactions st
      JOIN retailer_data_raw rdr ON st.raw_id = rdr.id
      JOIN equivalence_map em ON rdr.id = em.raw_id
      JOIN manufacturer_catalog mc ON em.master_id = mc.id
      LEFT JOIN brands b ON mc.brand_id = b.id
      LEFT JOIN categories c ON mc.category_id = c.id
      JOIN source_systems ss ON st.source_system_id = ss.id
      ${whereClause}
      GROUP BY mc.id, mc.canonical_name, b.name, c.name, em.is_competitor
      ORDER BY ${orderBy}
      LIMIT $${paramIndex}
    `;

    params.push(limit);
    const result = await pool.query(query, params);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      productId: row.id,
      productName: row.product_name,
      brand: row.brand,
      category: row.category,
      isCompetitor: row.is_competitor,
      revenue: parseFloat(row.total_revenue),
      units: parseInt(row.total_units),
      retailerCount: parseInt(row.retailer_count)
    }));
  }

  async exportReport(options: { reportType: string; filters: any; format: string }) {
    // Simplified export - in production would generate proper CSV/Excel
    const { reportType, filters } = options;

    let data: any[];
    switch (reportType) {
      case 'sales':
        data = await this.getSalesData(filters);
        break;
      case 'benchmark':
        data = await this.getCompetitorBenchmark(filters);
        break;
      case 'market-share':
        data = await this.getMarketShare(filters);
        break;
      default:
        data = [];
    }

    if (options.format === 'csv') {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(','));
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(data, null, 2);
  }

  private getPreviousMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
  }
}
