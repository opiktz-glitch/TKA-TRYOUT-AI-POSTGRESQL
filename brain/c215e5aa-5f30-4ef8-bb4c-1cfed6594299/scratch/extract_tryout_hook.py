import os
import re

jsx_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\TryoutManagement.jsx'
with open(jsx_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Match the body of the function before return (
match = re.search(r'(function TryoutManagement\(\) \{.*?\n  // =====================================================\n  // RENDER\n  // =====================================================\n\n  )return \(', text, re.DOTALL)

if not match:
    print('Failed to match TryoutManagement body')
    exit(1)

body = match.group(1)
return_statement_idx = match.end(1)

# Inside the body, everything after `function TryoutManagement() {\n` is what we want.
body_inner = body.split('function TryoutManagement() {\n')[1].rstrip()
# body_inner contains all the hooks, useEffects, functions, etc.

# Identify the exported variables/functions from the hook.
# Let's write a small helper to find all consts and functions defined at the top level of the body.
vars_to_export = [
    'user',
    'defaultBankScope',
    'tryouts', 'subjects',
    'search', 'setSearch',
    'subjectFilter', 'setSubjectFilter',
    'statusFilter', 'setStatusFilter',
    'onlyMine', 'setOnlyMine',
    'currentPage', 'setCurrentPage',
    'TRYOUTS_PER_PAGE',
    'loading', 'loadError',
    'actionError', 'actionSuccess',
    'deletingId',
    'showModal', 'wizardStep', 'editingTryout', 'saving',
    'form', 'setForm', 'formError', 'formSuccess',
    'bulkPoints', 'setBulkPoints',
    'showReviewModal', 'reviewingTryout',
    'hasActiveTryoutFilter', 'filteredTryouts', 'totalPages', 'paginatedTryouts',
    'totalPoints', 'difficultyBreakdown',
    'getSubjectName', 'getDifficultyLabel',
    'resetTryoutFilters',
    'openModal', 'closeModal', 'goToStep',
    'handleChange', 'applyBulkPoints',
    'openEditModal', 'openReviewModal', 'closeReviewModal',
    'handleSubmit', 'handleDelete'
]

# We need to construct the hook file.
# We also need imports.
hook_imports = """import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSubjects,
  getTryouts,
  getTryout,
  getTryoutReview,
  createTryout,
  updateTryout,
  deleteTryout as deleteTryoutApi,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";
"""

hook_content = hook_imports + "\n" + "export function useTryoutManagement(DIFFICULTIES) {\n" + body_inner + "\n  return {\n    " + ",\n    ".join(vars_to_export) + "\n  };\n}\n"

hook_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useTryoutManagement.js'
os.makedirs(os.path.dirname(hook_path), exist_ok=True)
with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(hook_content)

# Now rebuild TryoutManagement.jsx
# Remove the old imports that are now in the hook
# Keep only UI imports
new_imports = """import React from "react";
import TryoutTable from "../components/TryoutTable";
import TryoutFormWizardModal from "../components/TryoutFormWizardModal";
import TryoutReviewModal from "../components/TryoutReviewModal";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import "../components/TryoutWizard.css";
import { useTryoutManagement } from "../hooks/useTryoutManagement";

const DIFFICULTIES = [
  { value: "EASY", label: "Mudah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HARD", label: "Sulit" },
];

function TryoutManagement() {
"""

# Extract the destructured vars
destructure_vars = "  const {\n    " + ",\n    ".join(vars_to_export) + "\n  } = useTryoutManagement(DIFFICULTIES);\n\n  return ("

# The rest of the file after the match
rest_of_file = text[return_statement_idx:]

new_jsx_content = new_imports + destructure_vars + rest_of_file

with open(jsx_path, 'w', encoding='utf-8') as f:
    f.write(new_jsx_content)

print('Hook extracted successfully')
