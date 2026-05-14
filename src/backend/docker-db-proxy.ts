import { execSync } from 'child_process';

// Docker-based database proxy for when pg-pool fails
export class DockerPgProxy {
  private containerName: string;
  private dbName: string;
  private dbUser: string;

  constructor(containerName = 'sre-postgres', dbName = 'sre_database', dbUser = 'sre_user') {
    this.containerName = containerName;
    this.dbName = dbName;
    this.dbUser = dbUser;
  }

  // Execute a query via docker exec
  async query(sql: string, params: any[] = []): Promise<{ rows: any[], rowCount?: number }> {
    try {
      // Escape parameters for SQL injection protection
      const escapedParams = params.map(p => {
        if (typeof p === 'string') {
          return `'${p.replace(/'/g, "''")}'`;
        }
        return p;
      });

      // Simple parameter substitution
      let query = sql;
      if (params.length > 0) {
        params.forEach((param, i) => {
          query = query.replace('$' + (i + 1), escapedParams[i]);
        });
      }

      const result = execSync(
        `docker exec ${this.containerName} psql -U ${this.dbUser} -d ${this.dbName} -t -A -c "${query}"`,
        { encoding: 'utf8' }
      );

      // Parse the result into rows
      const lines = result.trim().split('\n').filter(line => line.length > 0);
      
      if (lines.length === 0) {
        return { rows: [] };
      }

      // For SELECT queries, parse into objects
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        // Get column names from the SQL (simplified approach)
        const rows = lines.map(line => {
          const values = line.split('|');
          return values;
        });
        return { rows };
      }

      // For INSERT/UPDATE/DELETE, just return success
      return { rows: [], rowCount: lines.length };
    } catch (error: any) {
      console.error('Docker database query failed:', error.message);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // Specific method for user lookup
  async getUserByUsername(username: string): Promise<any | null> {
    const result = await this.query(
      'SELECT id, username, password, role, email FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return null;
    }

    const [id, dbUsername, password, role, email] = result.rows[0];
    return {
      id,
      username: dbUsername,
      password,
      role,
      email
    };
  }

  // Health check
  async testConnection() {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const dockerDb = new DockerPgProxy();