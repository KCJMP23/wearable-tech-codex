import { SegmentCondition, SegmentOperator } from '../types';

export interface QueryField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  table?: string;
  column?: string;
  description?: string;
  options?: { value: any; label: string }[];
}

export interface QueryBuilder {
  conditions: SegmentCondition[];
  logicalOperator: 'AND' | 'OR';
}

export class SegmentationQueryBuilder {
  private availableFields: QueryField[] = [
    // Subscriber fields
    {
      id: 'email',
      name: 'Email',
      type: 'string',
      table: 'email_subscribers',
      column: 'email',
      description: 'Subscriber email address',
    },
    {
      id: 'first_name',
      name: 'First Name',
      type: 'string',
      table: 'email_subscribers',
      column: 'first_name',
      description: 'Subscriber first name',
    },
    {
      id: 'last_name',
      name: 'Last Name',
      type: 'string',
      table: 'email_subscribers',
      column: 'last_name',
      description: 'Subscriber last name',
    },
    {
      id: 'status',
      name: 'Status',
      type: 'string',
      table: 'email_subscribers',
      column: 'status',
      description: 'Subscriber status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'unsubscribed', label: 'Unsubscribed' },
        { value: 'bounced', label: 'Bounced' },
        { value: 'complained', label: 'Complained' },
        { value: 'pending', label: 'Pending' },
      ],
    },
    {
      id: 'source',
      name: 'Source',
      type: 'string',
      table: 'email_subscribers',
      column: 'source',
      description: 'How the subscriber signed up',
    },
    {
      id: 'subscribed_at',
      name: 'Subscribed Date',
      type: 'date',
      table: 'email_subscribers',
      column: 'subscribed_at',
      description: 'Date when subscriber signed up',
    },
    {
      id: 'last_active_at',
      name: 'Last Active',
      type: 'date',
      table: 'email_subscribers',
      column: 'last_active_at',
      description: 'Last time subscriber was active',
    },
    {
      id: 'bounce_count',
      name: 'Bounce Count',
      type: 'number',
      table: 'email_subscribers',
      column: 'bounce_count',
      description: 'Number of bounced emails',
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'array',
      table: 'email_subscribers',
      column: 'tags',
      description: 'Subscriber tags',
    },

    // Analytics fields
    {
      id: 'email_opens',
      name: 'Email Opens',
      type: 'number',
      description: 'Total number of email opens',
    },
    {
      id: 'email_clicks',
      name: 'Email Clicks',
      type: 'number',
      description: 'Total number of email clicks',
    },
    {
      id: 'last_opened',
      name: 'Last Email Opened',
      type: 'date',
      description: 'Date of last email open',
    },
    {
      id: 'last_clicked',
      name: 'Last Email Clicked',
      type: 'date',
      description: 'Date of last email click',
    },

    // Geographic fields
    {
      id: 'country',
      name: 'Country',
      type: 'string',
      description: 'Subscriber country',
    },
    {
      id: 'region',
      name: 'Region/State',
      type: 'string',
      description: 'Subscriber region or state',
    },
    {
      id: 'city',
      name: 'City',
      type: 'string',
      description: 'Subscriber city',
    },

    // Behavioral fields
    {
      id: 'product_views',
      name: 'Product Views',
      type: 'number',
      description: 'Total number of product views',
    },
    {
      id: 'cart_abandonment_count',
      name: 'Cart Abandonments',
      type: 'number',
      description: 'Number of abandoned carts',
    },
    {
      id: 'purchase_count',
      name: 'Purchase Count',
      type: 'number',
      description: 'Total number of purchases',
    },
    {
      id: 'total_spent',
      name: 'Total Spent',
      type: 'number',
      description: 'Total amount spent',
    },
    {
      id: 'average_order_value',
      name: 'Average Order Value',
      type: 'number',
      description: 'Average order value',
    },
    {
      id: 'last_purchase_date',
      name: 'Last Purchase Date',
      type: 'date',
      description: 'Date of last purchase',
    },
    {
      id: 'favorite_category',
      name: 'Favorite Category',
      type: 'string',
      description: 'Most purchased product category',
    },
    {
      id: 'lifecycle_stage',
      name: 'Lifecycle Stage',
      type: 'string',
      description: 'Customer lifecycle stage',
      options: [
        { value: 'new', label: 'New Customer' },
        { value: 'active', label: 'Active Customer' },
        { value: 'at_risk', label: 'At Risk' },
        { value: 'churned', label: 'Churned' },
        { value: 'vip', label: 'VIP Customer' },
      ],
    },

    // Custom fields
    {
      id: 'custom_fields',
      name: 'Custom Fields',
      type: 'object',
      table: 'email_subscribers',
      column: 'custom_fields',
      description: 'Custom subscriber fields',
    },
  ];

  getAvailableFields(): QueryField[] {
    return this.availableFields;
  }

  getFieldById(fieldId: string): QueryField | undefined {
    return this.availableFields.find(field => field.id === fieldId);
  }

  getSupportedOperators(fieldType: string): SegmentOperator[] {
    switch (fieldType) {
      case 'string':
        return ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_null', 'is_not_null'];
      case 'number':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'is_null', 'is_not_null'];
      case 'date':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'is_null', 'is_not_null'];
      case 'boolean':
        return ['equals', 'not_equals', 'is_null', 'is_not_null'];
      case 'array':
        return ['contains', 'not_contains', 'is_null', 'is_not_null'];
      case 'object':
        return ['contains', 'not_contains', 'is_null', 'is_not_null'];
      default:
        return ['equals', 'not_equals', 'is_null', 'is_not_null'];
    }
  }

  validateCondition(condition: SegmentCondition): { isValid: boolean; error?: string } {
    const field = this.getFieldById(condition.field);
    if (!field) {
      return { isValid: false, error: 'Invalid field' };
    }

    const supportedOperators = this.getSupportedOperators(field.type);
    if (!supportedOperators.includes(condition.operator)) {
      return { isValid: false, error: 'Invalid operator for field type' };
    }

    // Validate value based on field type and operator
    if (!['is_null', 'is_not_null'].includes(condition.operator)) {
      if (condition.value === null || condition.value === undefined) {
        return { isValid: false, error: 'Value is required' };
      }

      switch (field.type) {
        case 'number':
          if (isNaN(Number(condition.value))) {
            return { isValid: false, error: 'Value must be a number' };
          }
          break;
        case 'date':
          if (isNaN(Date.parse(condition.value))) {
            return { isValid: false, error: 'Value must be a valid date' };
          }
          break;
        case 'boolean':
          if (typeof condition.value !== 'boolean') {
            return { isValid: false, error: 'Value must be true or false' };
          }
          break;
      }
    }

    return { isValid: true };
  }

  buildSQL(
    tenantId: string,
    conditions: SegmentCondition[],
    logicalOperator: 'AND' | 'OR' = 'AND'
  ): { query: string; params: any[] } {
    if (conditions.length === 0) {
      return {
        query: 'SELECT id FROM email_subscribers WHERE tenant_id = $1 AND status = \'active\'',
        params: [tenantId],
      };
    }

    const whereConditions: string[] = [];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    for (const condition of conditions) {
      const field = this.getFieldById(condition.field);
      if (!field) continue;

      const validation = this.validateCondition(condition);
      if (!validation.isValid) continue;

      const sqlCondition = this.buildSQLCondition(field, condition, params, paramIndex);
      if (sqlCondition.condition) {
        whereConditions.push(sqlCondition.condition);
        paramIndex = sqlCondition.nextParamIndex;
      }
    }

    let query = `
      SELECT DISTINCT s.id 
      FROM email_subscribers s
    `;

    // Add JOINs for analytics and other tables
    const needsAnalytics = conditions.some(c => 
      ['email_opens', 'email_clicks', 'last_opened', 'last_clicked'].includes(c.field)
    );

    if (needsAnalytics) {
      query += `
        LEFT JOIN (
          SELECT 
            subscriber_id,
            COUNT(CASE WHEN event = 'opened' THEN 1 END) as email_opens,
            COUNT(CASE WHEN event = 'clicked' THEN 1 END) as email_clicks,
            MAX(CASE WHEN event = 'opened' THEN timestamp END) as last_opened,
            MAX(CASE WHEN event = 'clicked' THEN timestamp END) as last_clicked
          FROM email_analytics 
          GROUP BY subscriber_id
        ) analytics ON s.id = analytics.subscriber_id
      `;
    }

    query += ` WHERE s.tenant_id = $1`;

    if (whereConditions.length > 0) {
      query += ` AND (${whereConditions.join(` ${logicalOperator} `)})`;
    }

    return { query, params };
  }

  private buildSQLCondition(
    field: QueryField,
    condition: SegmentCondition,
    params: any[],
    paramIndex: number
  ): { condition: string; nextParamIndex: number } {
    const column = this.getColumnReference(field);
    let sqlCondition = '';

    switch (condition.operator) {
      case 'equals':
        sqlCondition = `${column} = $${paramIndex}`;
        params.push(condition.value);
        paramIndex++;
        break;

      case 'not_equals':
        sqlCondition = `${column} != $${paramIndex}`;
        params.push(condition.value);
        paramIndex++;
        break;

      case 'contains':
        if (field.type === 'array') {
          sqlCondition = `${column} @> $${paramIndex}::jsonb`;
          params.push(JSON.stringify([condition.value]));
        } else {
          sqlCondition = `${column} ILIKE $${paramIndex}`;
          params.push(`%${condition.value}%`);
        }
        paramIndex++;
        break;

      case 'not_contains':
        if (field.type === 'array') {
          sqlCondition = `NOT (${column} @> $${paramIndex}::jsonb)`;
          params.push(JSON.stringify([condition.value]));
        } else {
          sqlCondition = `${column} NOT ILIKE $${paramIndex}`;
          params.push(`%${condition.value}%`);
        }
        paramIndex++;
        break;

      case 'starts_with':
        sqlCondition = `${column} ILIKE $${paramIndex}`;
        params.push(`${condition.value}%`);
        paramIndex++;
        break;

      case 'ends_with':
        sqlCondition = `${column} ILIKE $${paramIndex}`;
        params.push(`%${condition.value}`);
        paramIndex++;
        break;

      case 'greater_than':
        sqlCondition = `${column} > $${paramIndex}`;
        params.push(condition.value);
        paramIndex++;
        break;

      case 'less_than':
        sqlCondition = `${column} < $${paramIndex}`;
        params.push(condition.value);
        paramIndex++;
        break;

      case 'is_null':
        sqlCondition = `${column} IS NULL`;
        break;

      case 'is_not_null':
        sqlCondition = `${column} IS NOT NULL`;
        break;

      case 'in':
        const values = Array.isArray(condition.value) ? condition.value : [condition.value];
        const placeholders = values.map(() => `$${paramIndex++}`).join(',');
        sqlCondition = `${column} IN (${placeholders})`;
        params.push(...values);
        break;

      case 'not_in':
        const notValues = Array.isArray(condition.value) ? condition.value : [condition.value];
        const notPlaceholders = notValues.map(() => `$${paramIndex++}`).join(',');
        sqlCondition = `${column} NOT IN (${notPlaceholders})`;
        params.push(...notValues);
        break;
    }

    return { condition: sqlCondition, nextParamIndex: paramIndex };
  }

  private getColumnReference(field: QueryField): string {
    // Handle special fields that require subqueries or JOINs
    switch (field.id) {
      case 'email_opens':
        return 'analytics.email_opens';
      case 'email_clicks':
        return 'analytics.email_clicks';
      case 'last_opened':
        return 'analytics.last_opened';
      case 'last_clicked':
        return 'analytics.last_clicked';
      default:
        return field.table ? `${field.table.charAt(0)}.${field.column}` : `s.${field.column || field.id}`;
    }
  }

  // Pre-built segment templates
  getSegmentTemplates(): Record<string, QueryBuilder> {
    return {
      engaged_subscribers: {
        conditions: [
          {
            field: 'email_opens',
            operator: 'greater_than',
            value: 5,
            logicalOperator: 'AND',
          },
          {
            field: 'last_opened',
            operator: 'greater_than',
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
            logicalOperator: 'AND',
          },
        ],
        logicalOperator: 'AND',
      },

      inactive_subscribers: {
        conditions: [
          {
            field: 'last_active_at',
            operator: 'less_than',
            value: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
            logicalOperator: 'OR',
          },
          {
            field: 'last_active_at',
            operator: 'is_null',
            value: null,
            logicalOperator: 'OR',
          },
        ],
        logicalOperator: 'OR',
      },

      high_value_customers: {
        conditions: [
          {
            field: 'total_spent',
            operator: 'greater_than',
            value: 500,
            logicalOperator: 'AND',
          },
          {
            field: 'purchase_count',
            operator: 'greater_than',
            value: 3,
            logicalOperator: 'AND',
          },
        ],
        logicalOperator: 'AND',
      },

      recent_subscribers: {
        conditions: [
          {
            field: 'subscribed_at',
            operator: 'greater_than',
            value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            logicalOperator: 'AND',
          },
        ],
        logicalOperator: 'AND',
      },

      cart_abandoners: {
        conditions: [
          {
            field: 'cart_abandonment_count',
            operator: 'greater_than',
            value: 0,
            logicalOperator: 'AND',
          },
        ],
        logicalOperator: 'AND',
      },

      never_purchased: {
        conditions: [
          {
            field: 'purchase_count',
            operator: 'equals',
            value: 0,
            logicalOperator: 'OR',
          },
          {
            field: 'purchase_count',
            operator: 'is_null',
            value: null,
            logicalOperator: 'OR',
          },
        ],
        logicalOperator: 'OR',
      },
    };
  }
}