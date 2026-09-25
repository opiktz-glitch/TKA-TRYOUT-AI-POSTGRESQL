import os

with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\TryoutManagement.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if 'TABLE CARD & FILTER' in l:
        start_idx = i - 1
    if start_idx != -1 and '</div>' in l and '</div>' in lines[i+1] and '</main>' in lines[i+2]:
        end_idx = i
        break

if start_idx == -1 or end_idx == -1:
    print('Failed to find bounds')
    exit(1)

chunk_lines = lines[start_idx:end_idx+1]
chunk_lines = [line[10:] if line.startswith(' '*10) else line for line in chunk_lines]
cleaned_chunk = ''.join(chunk_lines)

modal_code = f'''import React from 'react';
import {{ IconSearch, IconCheck, IconEdit, IconEye, IconTrash }} from './Icons';
import Pagination from './Pagination';

export default function TryoutTable({{
  search, setSearch,
  subjectFilter, setSubjectFilter, subjects,
  statusFilter, setStatusFilter,
  loading, loadError, showModal,
  actionError, actionSuccess,
  filteredTryouts, user, onlyMine, setOnlyMine,
  hasActiveTryoutFilter, resetTryoutFilters,
  paginatedTryouts, getSubjectName,
  openEditModal, openReviewModal, handleDelete, deletingId,
  currentPage, totalPages, TRYOUTS_PER_PAGE, setCurrentPage
}}) {{
  return (
    <>
{cleaned_chunk}
    </>
  );
}}
'''

with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\TryoutTable.jsx', 'w', encoding='utf-8') as f:
    f.write(modal_code)

replacement = '''          <TryoutTable
            search={search} setSearch={setSearch}
            subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter} subjects={subjects}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            loading={loading} loadError={loadError} showModal={showModal}
            actionError={actionError} actionSuccess={actionSuccess}
            filteredTryouts={filteredTryouts} user={user} onlyMine={onlyMine} setOnlyMine={setOnlyMine}
            hasActiveTryoutFilter={hasActiveTryoutFilter} resetTryoutFilters={resetTryoutFilters}
            paginatedTryouts={paginatedTryouts} getSubjectName={getSubjectName}
            openEditModal={openEditModal} openReviewModal={openReviewModal} handleDelete={handleDelete} deletingId={deletingId}
            currentPage={currentPage} totalPages={totalPages} TRYOUTS_PER_PAGE={TRYOUTS_PER_PAGE} setCurrentPage={setCurrentPage}
          />\n'''
new_lines = lines[:start_idx] + [replacement] + lines[end_idx+1:]
import_idx = -1
for i, l in enumerate(new_lines):
    if 'import TryoutFormWizardModal' in l:
        import_idx = i
        break
new_lines.insert(import_idx, 'import TryoutTable from "../components/TryoutTable";\n')

with open(r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\TryoutManagement.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('TryoutTable extracted successfully!')
