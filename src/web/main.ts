import './styles.css';
import { mountHome } from './pages/HomePage';
import { mountEdit } from './pages/EditPage';
import { mountNote } from './pages/NotePage';
import { mountApi } from './pages/ApiPage';
import { renderErrorView } from './components/ErrorView';
import { applyDocumentLang, langFromDocsPath, t } from './lib/i18n';

applyDocumentLang();

function route(): void {
  const root = document.getElementById('app')!;
  const path = window.location.pathname;

  if (path === '/' || path === '') {
    mountHome(root);
    return;
  }
  const docsLang = langFromDocsPath(path);
  if (docsLang) {
    mountApi(root, docsLang);
    return;
  }
  const editMatch = path.match(/^\/edit\/([^/]+)\/?$/);
  if (editMatch) {
    mountEdit(root, decodeURIComponent(editMatch[1]));
    return;
  }
  const noteMatch = path.match(/^\/note\/([^/]+)\/?$/);
  if (noteMatch) {
    mountNote(root, decodeURIComponent(noteMatch[1]));
    return;
  }
  renderErrorView(root, t().pageNotFound);
}

window.addEventListener('popstate', route);
route();
