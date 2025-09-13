// Simple traffic light cycling service
class TrafficLightService {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚦 Starting traffic light cycling service...');
    
    // Process traffic cycles every 10 seconds
    this.interval = setInterval(async () => {
      try {
        const response = await fetch('/api/traffic/cycle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Traffic cycle processed: ${result.updatedLights} lights updated`);
        } else {
          console.error('❌ Failed to process traffic cycle');
        }
      } catch (error) {
        console.error('❌ Error in traffic light service:', error);
      }
    }, 10000); // Every 10 seconds
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 Traffic light cycling service stopped');
  }
}

// Auto-start the service when this module is imported
const trafficService = new TrafficLightService();

// Start the service after a short delay to ensure the server is ready
if (typeof window !== 'undefined') {
  // Client-side - start after page load
  setTimeout(() => {
    trafficService.start();
  }, 2000);
}

export default trafficService;