/**
 * Unit tests for Claude service — focused on mockParseResult
 * and JSON parsing fallback logic (no network required).
 *
 * Run with: npx jest __tests__/claude.test.ts
 */

import { mockParseResult } from '../services/claude';

describe('mockParseResult', () => {
  it('detects a project from keyword "projet"', () => {
    const result = mockParseResult('Créer un projet de refonte du site');
    expect(result.type).toBe('project');
    expect(result.subtasks).toBeDefined();
    expect(result.subtasks!.length).toBeGreaterThan(0);
  });

  it('detects a project from keyword "créer une app"', () => {
    const result = mockParseResult('Je veux créer une app mobile');
    expect(result.type).toBe('project');
  });

  it('detects a routine from keyword "tous les jours"', () => {
    const result = mockParseResult('Faire du sport tous les jours');
    expect(result.type).toBe('routine');
    expect(result.repeat).toBe('daily');
  });

  it('detects a routine from keyword "chaque matin"', () => {
    const result = mockParseResult('Méditer chaque matin');
    expect(result.type).toBe('routine');
  });

  it('falls back to task for generic input', () => {
    const result = mockParseResult('Envoyer le rapport à 14h');
    expect(result.type).toBe('task');
    expect(result.title).toBe('Envoyer le rapport à 14h');
    expect(result.date).toBeDefined();
  });

  it('task result always has a date', () => {
    const result = mockParseResult('Rappeler dentiste');
    expect(result.type).toBe('task');
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
