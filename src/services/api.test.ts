import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSessionPayload } from './api';

test('normalizeSessionPayload derives provided and additional materials from study materials', () => {
  const rawSession = {
    id: 'session-1',
    name: 'Test Session',
    category: '.NET with C#',
    description: 'A test session',
    learningObjectives: [],
    topics: [],
    studyMaterials: [
      {
        id: 'm1',
        sessionId: 'session-1',
        title: 'Official Guide',
        type: 'PDF',
        url: 'https://example.com/guide.pdf',
        description: 'Official material',
        materialCategory: 'Provided',
        materialType: 'Provided',
        currentVersion: 1,
        versions: []
      },
      {
        id: 'm2',
        sessionId: 'session-1',
        title: 'Extra Reading',
        type: 'External',
        url: 'https://example.com/extra',
        description: 'Extra material',
        materialCategory: 'Additional',
        materialType: 'Additional',
        currentVersion: 1,
        versions: []
      }
    ],
    assignments: [
      {
        id: 'a1',
        sessionId: 'session-1',
        title: 'Build a sample API',
        description: 'Create a small API',
        dueDate: '2026-08-15',
        totalPoints: 100,
        instructions: 'Submit a link',
        submissionFormat: 'URL',
        status: 'Pending'
      }
    ]
  };

  const normalized = normalizeSessionPayload(rawSession);

  assert.equal(normalized.providedMaterials?.length, 1);
  assert.equal(normalized.additionalMaterials?.length, 1);
  assert.equal(normalized.assignments?.length, 1);
  assert.equal(normalized.providedMaterials?.[0].title, 'Official Guide');
  assert.equal(normalized.additionalMaterials?.[0].title, 'Extra Reading');
});
