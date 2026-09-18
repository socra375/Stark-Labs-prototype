import type { ToolCallCandidate } from '../types';
import type { ObjectManager } from '../../core/ObjectManager';
import type { AssemblyManager } from '../../editor/AssemblyManager';
import type { ImageAnalysisResult } from '../ImageAnalysis';
import type { ComponentSuggestion } from '../ComponentSuggestions';
import type { ConstructionPlanStep } from '../ConstructionPlan';

export interface AIInterpretResult {
  candidates: ToolCallCandidate[];
  /** Shown to the user alongside/instead of a proposal — e.g. "I didn't understand that." */
  message?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  interpret(text: string): Promise<AIInterpretResult>;
  /** Objectively-computable pixel facts about an uploaded image — never object recognition. */
  analyzeImage(file: File): Promise<ImageAnalysisResult>;
  /** Real, scene-derived suggestions (unpaired mirrors, disconnected pieces) — never invented. */
  suggestComponents(objects: ObjectManager, assembly: AssemblyManager): Promise<ComponentSuggestion[]>;
  /** A real computed build order from the actual hierarchy/connections — never a narrated guess. */
  generateConstructionPlan(objects: ObjectManager, assembly: AssemblyManager): Promise<ConstructionPlanStep[]>;
}
