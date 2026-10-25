import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './load-ts.mjs';
const navigation=loadTs('lib/workspace-navigation.ts');
test('workspace selection accepts only a company returned for the owner',()=>{
  const companies=[{id:'owned-a'},{id:'owned-b'}];
  assert.equal(navigation.selectWorkspaceCompany(companies,'owned-b','owned-a'),'owned-b');
  assert.equal(navigation.selectWorkspaceCompany(companies,'other-owner','owned-b'),'owned-b');
  assert.equal(navigation.selectWorkspaceCompany(companies,'other-owner','removed-company'),'owned-a');
  assert.equal(navigation.selectWorkspaceCompany([], 'other-owner','owned-b'),'');
});
test('workspace navigation preserves company selection and anchor destinations without changing public routes',()=>{
  assert.equal(navigation.workspaceHref('/tasks#record','company a'),'/tasks?companyId=company%20a#record');
  assert.equal(navigation.workspaceHref('/workflows?view=all','company-a'),'/workflows?view=all&companyId=company-a');
  assert.equal(navigation.workspaceHref('/company',''),'/company');
  for(const route of ['/workspace','/dashboard','/agents','/tasks','/leads','/sales','/integrations','/marketplace','/workflows'])assert.equal(navigation.isWorkspacePath(route),true);
  for(const route of ['/','/auth','/project','/discover','/workflows-public'])assert.equal(navigation.isWorkspacePath(route),false);
});
