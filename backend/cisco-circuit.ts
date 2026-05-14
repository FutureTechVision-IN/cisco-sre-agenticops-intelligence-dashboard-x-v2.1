/**
 * Cisco CIRCUIT AI Integration
 * This module provides AI-powered analysis using Cisco's internal CIRCUIT API
 */

const CISCO_CIRCUIT_API_KEY = process.env.CISCO_CIRCUIT_API_KEY || '';
const CISCO_CIRCUIT_ENDPOINT = process.env.CISCO_CIRCUIT_ENDPOINT || "https://circuit.cisco.com/api/v1";

export interface CircuitResponse {
  success: boolean;
  content?: string;
  error?: string;
  model: string;
  timestamp: string;
}

/**
 * Test basic text generation with Cisco CIRCUIT API
 */
export async function testTextGeneration(prompt: string): Promise<CircuitResponse> {
  try {
    const response = await fetch(`${CISCO_CIRCUIT_ENDPOINT}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CISCO_CIRCUIT_API_KEY}`,
        "X-Cisco-App": "SRE-AgenticOps-Dashboard"
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.warn(`[CIRCUIT API] Error: ${response.status}, using fallback`);
      return {
        success: false,
        error: `API returned ${response.status}`,
        content: "Cisco CIRCUIT API test - fallback response",
        model: "cisco-circuit-fallback",
        timestamp: new Date().toISOString(),
      };
    }

    const data = await response.json();

    return {
      success: true,
      content: data.summary || data.content || data.text || "Response received",
      model: "cisco-circuit-summarize",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[CIRCUIT API] Failed:", error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      content: "Cisco CIRCUIT API connectivity test - fallback mode",
      model: "cisco-circuit-fallback",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Analyze vulnerability data with Cisco CIRCUIT API
 */
export async function analyzeVulnerabilityData(inputData: {
  customerName: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
}): Promise<CircuitResponse> {
  try {
    const totalAssets = inputData.totVuln + inputData.potVuln + inputData.notVuln;
    const prompt = `As a cybersecurity expert, analyze this vulnerability data for ${inputData.customerName}:
- Vulnerable Assets: ${inputData.totVuln}
- Potentially Vulnerable Assets: ${inputData.potVuln}
- Not Vulnerable Assets: ${inputData.notVuln}
- Total Assets: ${totalAssets}

Provide:
1. Risk Assessment (Low/Medium/High/Critical)
2. Key Concerns
3. Recommended Actions
Keep response concise and actionable.`;

    const response = await fetch(`${CISCO_CIRCUIT_ENDPOINT}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CISCO_CIRCUIT_API_KEY}`,
        "X-Cisco-App": "SRE-AgenticOps-Dashboard"
      },
      body: JSON.stringify({
        prompt: prompt,
        context: "vulnerability_analysis",
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.warn(`[CIRCUIT API] Analysis error: ${response.status}, using fallback`);
      return generateFallbackAnalysis(inputData);
    }

    const result = await response.json();

    return {
      success: true,
      content: result.analysis || result.content || result.text || "Analysis complete",
      model: "cisco-circuit-analyze",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[CIRCUIT API] Analysis failed, using fallback:", error instanceof Error ? error.message : "Unknown error");
    return generateFallbackAnalysis(inputData);
  }
}

/**
 * Generate security recommendations using Cisco CIRCUIT API
 */
export async function generateSecurityRecommendations(context: string): Promise<CircuitResponse> {
  try {
    const prompt = `You are a senior security architect at Cisco. Based on this context:
${context}

Provide 5 specific, actionable security recommendations with implementation priority.`;

    const response = await fetch(`${CISCO_CIRCUIT_ENDPOINT}/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CISCO_CIRCUIT_API_KEY}`,
        "X-Cisco-App": "SRE-AgenticOps-Dashboard"
      },
      body: JSON.stringify({
        prompt: prompt,
        context: "security_recommendations",
        max_tokens: 1500,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      console.warn(`[CIRCUIT API] Recommendations error: ${response.status}, using fallback`);
      return generateFallbackRecommendations(context);
    }

    const result = await response.json();

    return {
      success: true,
      content: result.recommendations || result.content || result.text || "No recommendations available",
      model: "cisco-circuit-recommendations",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[CIRCUIT API] Recommendations failed, using fallback:", error instanceof Error ? error.message : "Unknown error");
    return generateFallbackRecommendations(context);
  }
}

/**
 * Generate fallback vulnerability analysis when CIRCUIT API is unavailable
 */
function generateFallbackAnalysis(data: {
  customerName: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
}): CircuitResponse {
  const totalAssets = data.totVuln + data.potVuln + data.notVuln;
  const vulnPercentage = ((data.totVuln / totalAssets) * 100).toFixed(1);
  const potVulnPercentage = ((data.potVuln / totalAssets) * 100).toFixed(1);

  let riskLevel = "Low";
  if (data.totVuln > totalAssets * 0.2) riskLevel = "Critical";
  else if (data.totVuln > totalAssets * 0.1) riskLevel = "High";
  else if (data.totVuln > totalAssets * 0.05) riskLevel = "Medium";

  const vulnConcern = data.totVuln > totalAssets * 0.1 
    ? "🚨 High vulnerability rate detected - immediate action required" 
    : "✓ Vulnerability rate within acceptable range";
  
  const potVulnConcern = data.potVuln > totalAssets * 0.1 
    ? "⚠️ Significant number of potentially vulnerable assets need verification" 
    : "✓ Potentially vulnerable assets are manageable";

  const analysis = `**Risk Assessment: ${riskLevel}**

**Key Metrics for ${data.customerName}:**
- Total Assets: ${totalAssets.toLocaleString()}
- Vulnerable: ${data.totVuln.toLocaleString()} (${vulnPercentage}%)
- Potentially Vulnerable: ${data.potVuln.toLocaleString()} (${potVulnPercentage}%)
- Secure: ${data.notVuln.toLocaleString()}

**Key Concerns:**
${vulnConcern}
${potVulnConcern}

**Recommended Actions:**
1. Prioritize patching of ${data.totVuln} confirmed vulnerable assets
2. Conduct detailed assessment of ${data.potVuln} potentially vulnerable assets
3. Implement continuous vulnerability scanning
4. Establish automated patch management workflows
5. Review and update security policies based on current threat landscape`;

  return {
    success: true,
    content: analysis,
    model: "cisco-fallback-analysis",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate intelligent fallback recommendations when CIRCUIT API is unavailable
 */
function generateFallbackRecommendations(context: string): CircuitResponse {
  const insights: string[] = [];
  
  // Parse context for key metrics
  const forecastMatch = context.match(/forecast (\d+(?:,\d{3})*)/);
  const confidenceMatch = context.match(/Confidence level (\d+)%/);
  const trendMatch = context.match(/Trend: (\w+)/);
  
  const forecast = forecastMatch ? parseInt(forecastMatch[1].replace(/,/g, '')) : 0;
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
  const trend = trendMatch ? trendMatch[1] : 'stable';
  
  // Generate contextual insights based on the data
  if (trend === 'increasing' || trend === 'INCREASING') {
    insights.push("🔺 **Trend Analysis**: Vulnerability count is increasing - implement proactive threat hunting and enhanced monitoring.");
  }
  
  if (confidence > 80) {
    insights.push("✅ **High Confidence Prediction**: Model shows high confidence (>80%) - prioritize resource allocation based on these forecasts.");
  } else if (confidence < 70) {
    insights.push("⚠️ **Moderate Confidence**: Prediction confidence below 70% - consider gathering more data points for improved accuracy.");
  }
  
  if (forecast > 10000000) {
    insights.push("🚨 **Scale Alert**: High vulnerability count (>10M) predicted - implement automated remediation workflows and risk-based prioritization.");
  }
  
  // Always add these strategic recommendations
  insights.push("🎯 **Strategic Priority**: Focus on CVE-2024 vulnerabilities as they represent the highest current risk exposure.");
  insights.push("⚡ **Automation Opportunity**: Deploy AI-powered vulnerability scanners to handle the scale of expected growth.");
  
  const content = insights.join('\n\n');
  
  return {
    success: true,
    content: content,
    model: "cisco-fallback-recommendations",
    timestamp: new Date().toISOString(),
  };
}
