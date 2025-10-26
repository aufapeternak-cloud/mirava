// Predefined server pool for worker assignment
const SERVER_POOL = [
  'us-east-1.compute.cloud',
  'us-west-2.compute.cloud',
  'eu-west-1.compute.cloud',
  'ap-southeast-1.compute.cloud',
  'us-central-1.compute.cloud'
];

let roundRobinIndex = 0;

export const serverSelection = {
  // Round-robin strategy
  assignServer() {
    const server = SERVER_POOL[roundRobinIndex];
    roundRobinIndex = (roundRobinIndex + 1) % SERVER_POOL.length;
    return server;
  },

  // Simulated least-busy strategy (for future enhancement)
  assignServerLeastBusy() {
    // In production, this would query actual server load
    // For now, randomly select to simulate distribution
    return SERVER_POOL[Math.floor(Math.random() * SERVER_POOL.length)];
  },

  getAllServers() {
    return [...SERVER_POOL];
  }
};
