import config from '../database/config.mjs';
import mysql from 'mysql2/promise';

async function setupTaxTables() {
  try {
    const conn = await mysql.createConnection(config);
    console.log('Connected to MySQL database:', config.database);

    // 1. tax_calculation_variables
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_calculation_variables (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        is_system BOOLEAN DEFAULT TRUE,
        default_value TEXT,
        source_type VARCHAR(100),
        source_mapping JSON,
        source_table VARCHAR(100),
        source_column VARCHAR(100),
        is_input BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. tax_calculation_parameters
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_calculation_parameters (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        value DECIMAL(15, 4) NOT NULL,
        unit VARCHAR(50),
        effective_from DATE NOT NULL,
        effective_to DATE,
        description_ar TEXT,
        description_en TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. tax_calculation_rules
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_calculation_rules (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        rule_type VARCHAR(50) NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        execution_order INT NOT NULL,
        output_variable VARCHAR(100) NOT NULL,
        dependencies JSON,
        active_version_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        effective_from DATE NOT NULL,
        effective_to DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. tax_rule_versions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_rule_versions (
        id VARCHAR(100) PRIMARY KEY,
        rule_id VARCHAR(100) NOT NULL,
        version_number INT NOT NULL,
        version_code VARCHAR(50) NOT NULL,
        formula_or_query TEXT NOT NULL,
        parameters_json JSON,
        effective_from DATE NOT NULL,
        effective_to DATE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        change_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        activated_at DATETIME NULL DEFAULT NULL,
        INDEX (rule_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. tax_brackets
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_brackets (
        id VARCHAR(100) PRIMARY KEY,
        rule_version_id VARCHAR(100),
        bracket_order INT NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        min_income DECIMAL(15,2) NOT NULL,
        max_income DECIMAL(15,2),
        tax_rate DECIMAL(5,2) NOT NULL,
        fixed_tax DECIMAL(15,2) DEFAULT 0,
        effective_from DATE NOT NULL,
        effective_to DATE,
        status VARCHAR(50) DEFAULT 'ACTIVE'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. tax_payroll_snapshots
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_payroll_snapshots (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL,
        employee_name_ar VARCHAR(255),
        employee_name_en VARCHAR(255),
        employee_number VARCHAR(100),
        department_id VARCHAR(100),
        department_name VARCHAR(255),
        branch_id VARCHAR(100),
        branch_name VARCHAR(255),
        payroll_id VARCHAR(100),
        payroll_period VARCHAR(20) NOT NULL,
        calculation_date DATE NOT NULL,
        input_values JSON,
        output_results JSON,
        rules_applied_trace JSON,
        calculation_engine_version VARCHAR(50),
        status VARCHAR(50) DEFAULT 'FINALIZED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. tax_audit_logs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_entity VARCHAR(100) NOT NULL,
        target_id VARCHAR(100),
        target_name_ar VARCHAR(255),
        summary_ar TEXT,
        summary_en TEXT,
        details_before JSON,
        details_after JSON
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Successfully created all 7 tax module tables in MySQL database: vitasiraq_hris_db!');
    await conn.end();
  } catch (err) {
    console.error('Error setting up tax tables:', err.message);
  }
}

setupTaxTables();
