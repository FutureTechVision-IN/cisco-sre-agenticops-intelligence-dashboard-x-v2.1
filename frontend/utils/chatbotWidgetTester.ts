/**
 * Chatbot Widget Test Suite
 * Comprehensive validation for visibility, persistence, and functionality
 */

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  timestamp: Date;
  details?: any;
}

export class ChatbotWidgetTester {
  private results: TestResult[] = [];

  // Test 1: Portal Container Availability
  async testPortalContainerAvailability(): Promise<TestResult> {
    const test = {
      name: 'Portal Container Availability',
      status: 'pending' as const,
      message: '',
      timestamp: new Date()
    };

    try {
      // Check if document.body exists
      if (!document.body) {
        throw new Error('document.body is null');
      }

      // Check if body has expected properties
      const computedStyle = window.getComputedStyle(document.body);
      const containValue = computedStyle.contain;
      
      test.status = 'pass';
      test.message = `Portal container available. CSS contain: ${containValue}`;
      test.details = { 
        bodyExists: true, 
        containValue,
        readyState: document.readyState 
      };
    } catch (error) {
      test.status = 'fail';
      test.message = `Portal container test failed: ${error}`;
      test.details = { error: error.toString() };
    }

    this.results.push(test);
    return test;
  }

  // Test 2: Widget DOM Presence
  async testWidgetDOMPresence(): Promise<TestResult> {
    const test = {
      name: 'Widget DOM Presence',
      status: 'pending' as const,
      message: '',
      timestamp: new Date()
    };

    try {
      // Wait for potential async rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const container = document.getElementById('ai-assistant-floating-container');
      const button = document.getElementById('ai-assistant-button');
      
      if (!container) {
        throw new Error('AI assistant container not found in DOM');
      }
      
      if (!button) {
        throw new Error('AI assistant button not found in DOM');
      }

      // Check if elements are visible
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      const containerVisible = containerRect.width > 0 && containerRect.height > 0;
      const buttonVisible = buttonRect.width > 0 && buttonRect.height > 0;
      
      if (!containerVisible || !buttonVisible) {
        throw new Error('Widget elements exist but are not visible');
      }

      test.status = 'pass';
      test.message = 'Widget successfully rendered and visible in DOM';
      test.details = { 
        containerRect, 
        buttonRect,
        containerStyles: window.getComputedStyle(container),
        buttonStyles: window.getComputedStyle(button)
      };
    } catch (error) {
      test.status = 'fail';
      test.message = `Widget DOM presence test failed: ${error}`;
      test.details = { error: error.toString() };
    }

    this.results.push(test);
    return test;
  }

  // Test 3: Z-Index Layering
  async testZIndexLayering(): Promise<TestResult> {
    const test = {
      name: 'Z-Index Layering',
      status: 'pending' as const,
      message: '',
      timestamp: new Date()
    };

    try {
      const container = document.getElementById('ai-assistant-floating-container');
      if (!container) {
        throw new Error('Container not found');
      }

      const computedStyle = window.getComputedStyle(container);
      const zIndex = computedStyle.zIndex;
      const position = computedStyle.position;
      
      if (zIndex !== '2147483647') {
        throw new Error(`Expected z-index 2147483647, got ${zIndex}`);
      }
      
      if (position !== 'fixed') {
        throw new Error(`Expected position fixed, got ${position}`);
      }

      test.status = 'pass';
      test.message = 'Z-index and positioning correct';
      test.details = { zIndex, position };
    } catch (error) {
      test.status = 'fail';
      test.message = `Z-index test failed: ${error}`;
      test.details = { error: error.toString() };
    }

    this.results.push(test);
    return test;
  }

  // Test 4: Visibility During State Changes
  async testVisibilityDuringStateChanges(): Promise<TestResult> {
    const test = {
      name: 'Visibility During State Changes',
      status: 'pending' as const,
      message: '',
      timestamp: new Date()
    };

    try {
      const container = document.getElementById('ai-assistant-floating-container');
      if (!container) {
        throw new Error('Container not found');
      }

      // Test visibility over multiple frames
      const visibilityChecks: boolean[] = [];
      
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const rect = container.getBoundingClientRect();
        visibilityChecks.push(rect.width > 0 && rect.height > 0);
      }
      
      const visibleCount = visibilityChecks.filter(Boolean).length;
      const visibilityRatio = visibleCount / visibilityChecks.length;
      
      if (visibilityRatio < 0.8) {
        throw new Error(`Widget visibility unstable: ${visibilityRatio * 100}% visible`);
      }

      test.status = 'pass';
      test.message = `Widget stable across ${visibilityChecks.length} checks (${visibilityRatio * 100}% visible)`;
      test.details = { visibilityChecks, visibilityRatio };
    } catch (error) {
      test.status = 'fail';
      test.message = `Visibility stability test failed: ${error}`;
      test.details = { error: error.toString() };
    }

    this.results.push(test);
    return test;
  }

  // Test 5: Interaction Functionality
  async testInteractionFunctionality(): Promise<TestResult> {
    const test = {
      name: 'Interaction Functionality',
      status: 'pending' as const,
      message: '',
      timestamp: new Date()
    };

    try {
      const button = document.getElementById('ai-assistant-button') as HTMLButtonElement;
      if (!button) {
        throw new Error('Button not found');
      }

      // Check if button is interactive
      if (button.disabled) {
        throw new Error('Button is disabled');
      }

      // Check ARIA attributes
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasAriaExpanded = button.hasAttribute('aria-expanded');
      
      if (!hasAriaLabel || !hasAriaExpanded) {
        throw new Error('Missing required ARIA attributes');
      }

      // Check tabIndex
      const tabIndex = button.tabIndex;
      if (tabIndex < 0) {
        throw new Error(`Button not keyboard accessible (tabIndex: ${tabIndex})`);
      }

      test.status = 'pass';
      test.message = 'All interaction and accessibility checks passed';
      test.details = { 
        disabled: button.disabled,
        ariaLabel: button.getAttribute('aria-label'),
        ariaExpanded: button.getAttribute('aria-expanded'),
        tabIndex
      };
    } catch (error) {
      test.status = 'fail';
      test.message = `Interaction test failed: ${error}`;
      test.details = { error: error.toString() };
    }

    this.results.push(test);
    return test;
  }

  // Run all tests
  async runAllTests(): Promise<TestResult[]> {
    console.log('[ChatbotWidgetTester] Starting comprehensive test suite...');
    
    this.results = [];
    
    await this.testPortalContainerAvailability();
    await this.testWidgetDOMPresence();
    await this.testZIndexLayering();
    await this.testVisibilityDuringStateChanges();
    await this.testInteractionFunctionality();
    
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    
    console.log(`[ChatbotWidgetTester] Tests completed: ${passCount} passed, ${failCount} failed`);
    
    return this.results;
  }

  // Get test results summary
  getResults(): TestResult[] {
    return [...this.results];
  }

  // Generate test report
  generateReport(): string {
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;
    
    let report = `\n=== CHATBOT WIDGET TEST REPORT ===\n`;
    report += `Total Tests: ${total}\n`;
    report += `Passed: ${passCount}\n`;
    report += `Failed: ${failCount}\n`;
    report += `Success Rate: ${total > 0 ? (passCount / total * 100).toFixed(1) : 0}%\n\n`;
    
    this.results.forEach(test => {
      const status = test.status === 'pass' ? '✅' : '❌';
      report += `${status} ${test.name}: ${test.message}\n`;
      if (test.details && test.status === 'fail') {
        report += `   Details: ${JSON.stringify(test.details, null, 2)}\n`;
      }
    });
    
    return report;
  }
}

// Global test runner for browser console
(window as any).testChatbotWidget = async () => {
  const tester = new ChatbotWidgetTester();
  await tester.runAllTests();
  console.log(tester.generateReport());
  return tester.getResults();
};