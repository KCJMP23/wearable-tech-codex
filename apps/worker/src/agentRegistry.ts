import type { Agent } from './agents/base';
import { orchestratorAgent } from './agents/orchestratorAgent';
import { productAgent } from './agents/productAgent';
import { reviewAgent } from './agents/reviewAgent';
import { editorialAgent } from './agents/editorialAgent';
import { imageAgent } from './agents/imageAgent';
import { linkVerifierAgent } from './agents/linkVerifierAgent';
import { trendsAgent } from './agents/trendsAgent';
import { adManagerAgent } from './agents/adManagerAgent';
import { socialAgent } from './agents/socialAgent';
import { seasonalAgent } from './agents/seasonalAgent';
import { newsletterAgent } from './agents/newsletterAgent';
import { personalizationAgent } from './agents/personalizationAgent';
import { chatbotAgent } from './agents/chatbotAgent';

export const agents: Record<string, Agent> = Object.fromEntries(
  [
    orchestratorAgent,
    productAgent,
    reviewAgent,
    editorialAgent,
    imageAgent,
    linkVerifierAgent,
    trendsAgent,
    adManagerAgent,
    socialAgent,
    seasonalAgent,
    newsletterAgent,
    personalizationAgent,
    chatbotAgent
  ].map((agent) => [agent.name, agent])
);

// Agent execution utilities
export function getAgent(agentName: string): Agent | null {
  return agents[agentName] || null;
}

export function listAgents(): Array<{ name: string; description: string; version: string }> {
  return Object.values(agents).map(agent => ({
    name: agent.name,
    description: agent.description,
    version: agent.version
  }));
}

export function getAgentsByCategory(): Record<string, Agent[]> {
  return {
    core: [orchestratorAgent],
    content: [editorialAgent, reviewAgent, imageAgent],
    products: [productAgent, linkVerifierAgent],
    marketing: [socialAgent, newsletterAgent, adManagerAgent],
    analytics: [trendsAgent, personalizationAgent],
    automation: [seasonalAgent, chatbotAgent]
  };
}

// Agent execution system
export async function executeAgent(
  agentName: string,
  task: any,
  dependencies: any
): Promise<any> {
  const agent = getAgent(agentName);
  
  if (!agent) {
    throw new Error(`Agent not found: ${agentName}`);
  }

  try {
    const result = await agent.execute(task, dependencies);
    return result;
  } catch (error) {
    console.error(`Agent execution failed for ${agentName}:`, error);
    throw error;
  }
}