import re
import os

files = [
    r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\dashboard\AdminDashboard.jsx',
    r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\dashboard\TeacherDashboard.jsx',
    r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\components\dashboard\StudentDashboard.jsx'
]

utils_exports = [
    'providerLabel', 'truncateText', 'timeAgo', 'shortDate', 'MIN_QUESTIONS_PER_CELL',
    'LIVE_REFRESH_MS', 'bankCellStyle', 'formatBytes', 'attentionBadgeStyle', 'scoreTier',
    'TREND_WIDTH', 'TREND_HEIGHT', 'TREND_PADDING_X', 'TREND_PADDING_TOP', 'TREND_PADDING_BOTTOM',
    'TREND_GRID_VALUES', 'trendValueToY', 'buildTrendPoints', 'roleCacheKey'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    used_utils = []
    for util in utils_exports:
        # Avoid matching the import statement itself if it already exists but is empty
        # but since we replace it, it's fine
        if re.search(r'\b' + util + r'\b', text):
            used_utils.append(util)
            
    if used_utils:
        import_stmt = 'import { ' + ', '.join(used_utils) + ' } from "../../utils/dashboardUtils";\n'
        
        if 'from "../../utils/dashboardUtils"' in text or "from '../../utils/dashboardUtils'" in text:
            text = re.sub(r'import\s+\{[^\}]*\}\s+from\s+[\x22\x27]\.\./\.\./utils/dashboardUtils[\x22\x27];?\n?', import_stmt, text)
        else:
            text = import_stmt + text
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('Fixed ' + os.path.basename(file_path) + ' with ' + str(used_utils))
