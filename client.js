/**
 * Client half of dsh-section (browser bundle, no build step).
 *
 * Sections are cross-project session groups owned by this plugin. The shipped
 * sidebar browser keeps owning the workspace/session tree by default, and this
 * plugin adds its own contributions around it:
 *   - `sidebar.panellist` + `main`  the Sections panel (create/rename/delete,
 *     assign and open sessions, prune stale entries) plus the view switch
 *   - `sidebar.workspaces.session.menu.item`  "Move to section..." per session
 *   - `sidebar.session.row.leading`  a colored section dot on the session row
 *   - `shell.overlay`  the section dropdown and the move-to-section dialog
 *   - `sidebar.workspaces`  while the view switch is on, the plugin shadows the
 *     shipped browser at a lower priority with the section tree; switching back
 *     disposes that entry, so the shipped browser returns unchanged
 *
 * State lives in localStorage: it is plugin-owned UI data, not session data.
 */
window.__ModuleLoader__.load({
	id: '@local/dsh-section',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		const NS = 'dsh-section';
		const PANEL_ID = 'dsh-section';
		const STORAGE_KEY = 'dsh-section.state.v1';
		const PICKER_LIMIT = 60;

		/** Section dropdown geometry: fixed panel width, ~30px per row. */
		/* The theme's brand accent renders monochrome here, so the unread marker keeps its own blue. */
		const UNREAD_COLOR = '#4C8DFF';
		const SECTION_MENU_WIDTH = 208;
		const SECTION_MENU_ROW = 30;

		const EN = {
			'panel.title': 'Sections',
			'panel.subtitle': 'Group sessions from different projects into one work thread.',
			'panel.new': 'New section',
			'panel.defaultName': 'New section',
			'panel.empty': 'No sections yet',
			'panel.emptyHint': 'Create one to start grouping sessions.',
			'panel.noMembers': 'No sessions in this section yet.',
			'panel.rename': 'Rename',
			'panel.delete': 'Delete',
			'panel.confirmDelete': 'Confirm delete?',
			'panel.open': 'Open',
			'panel.remove': 'Remove',
			'panel.addSession': 'Add sessions',
			'panel.cleanup': 'Prune missing',
			'panel.cleaned': 'Removed missing sessions:',
			'panel.unitSessions': 'sessions',
			'panel.missing': 'missing',
			'panel.untitled': 'Untitled session',
			'panel.inSection': 'in this section',
			'panel.pickerPlaceholder': 'Filter by title or project',
			'panel.pickerEmpty': 'No matching sessions',
			'panel.more': 'Keep typing to narrow the list',
			'panel.sidebarMode': 'Group the sidebar by sections',
			'panel.sidebarModeHint': 'Replace the shipped workspace browser with this section tree.',
			'sidebar.title': 'Sections',
			'sidebar.projects': 'Projects',
			'sidebar.filterProjects': 'Filter projects and sessions',
			'sidebar.showMore': 'Show more',
			'sidebar.newProject': 'Add project',
			'sidebar.emptyProjects': 'No projects yet.',
			'sidebar.newSection': 'New section',
			'sidebar.addSession': 'Add session',
			'sidebar.assign': 'Group',
			'sidebar.unassign': 'Ungroup',
			'sidebar.ungrouped': 'By project',
			'sidebar.newSession': 'New session',
			'sidebar.empty': 'No sessions',
			'sidebar.more': 'More actions',
			'sidebar.sessionMenu': 'Session actions',
			'sidebar.running': 'Running',
			'sidebar.unread': 'Unread',
			'sidebar.projectMenu': 'Project actions',
			'sidebar.archive': 'Archive',
			'sidebar.archiveProject': 'Archive project',
			'sidebar.confirmArchiveProject': 'Archive this project?',
			'sidebar.toSection': 'Move the project into a section…',
			'sidebar.collapse': 'Collapse',
			'sidebar.expand': 'Expand',
			'sidebar.filter': 'Filter sections and sessions',
			'menu.moveToSection': 'Move to section…',
			'dialog.title': 'Move to section',
			'dialog.target': 'Session',
			'dialog.pick': 'Section',
			'dialog.newSection': 'New section',
			'dialog.newPlaceholder': 'Section name',
			'dialog.none': 'No section',
			'dialog.cancel': 'Cancel',
			'dialog.confirm': 'Confirm',
			'dialog.renameTitle': 'Rename session',
			'dialog.projectTitle': 'Move project into a section',
			'dialog.projectTarget': 'Project',
			'dialog.projectPick': 'Pick one section for every session in this project',
		};

		const ZH = {
			'panel.title': '分组',
			'panel.subtitle': '把不同项目的会话归到同一条工作线里。',
			'panel.new': '新建分组',
			'panel.defaultName': '新分组',
			'panel.empty': '还没有分组',
			'panel.emptyHint': '先新建一个分组，再把会话放进来。',
			'panel.noMembers': '这个分组里还没有会话。',
			'panel.rename': '重命名',
			'panel.delete': '删除',
			'panel.confirmDelete': '确认删除？',
			'panel.open': '打开',
			'panel.remove': '移出',
			'panel.addSession': '添加会话',
			'panel.cleanup': '清理失效会话',
			'panel.cleaned': '已清理失效会话：',
			'panel.unitSessions': '个会话',
			'panel.missing': '已失效',
			'panel.untitled': '未命名会话',
			'panel.inSection': '已在此分组',
			'panel.pickerPlaceholder': '按标题或项目筛选',
			'panel.pickerEmpty': '没有匹配的会话',
			'panel.more': '继续输入以缩小范围',
			'panel.sidebarMode': '在侧栏按分组展示',
			'panel.sidebarModeHint': '用分组树替换宿主的会话浏览区。',
			'sidebar.title': '分组',
			'sidebar.projects': '项目',
			'sidebar.filterProjects': '筛选项目和会话',
			'sidebar.showMore': '显示更多',
			'sidebar.newProject': '新增项目',
			'sidebar.emptyProjects': '还没有项目。',
			'sidebar.newSection': '新建分组',
			'sidebar.addSession': '添加会话',
			'sidebar.assign': '加入分组',
			'sidebar.unassign': '移出分组',
			'sidebar.ungrouped': '按项目',
			'sidebar.newSession': '新建会话',
			'sidebar.empty': '没有会话',
			'sidebar.more': '更多操作',
			'sidebar.sessionMenu': '会话操作',
			'sidebar.running': '处理中',
			'sidebar.unread': '未读',
			'sidebar.projectMenu': '项目操作',
			'sidebar.archive': '归档',
			'sidebar.archiveProject': '归档项目',
			'sidebar.confirmArchiveProject': '确认归档该项目？',
			'sidebar.toSection': '整个项目加入分组…',
			'sidebar.collapse': '收起',
			'sidebar.expand': '展开',
			'sidebar.filter': '筛选分组和会话',
			'menu.moveToSection': '移入分组…',
			'dialog.title': '移入分组',
			'dialog.target': '会话',
			'dialog.pick': '分组',
			'dialog.cancel': '取消',
			'dialog.newSection': '新建分组',
			'dialog.newPlaceholder': '分组名称',
			'dialog.none': '移出分组',
			'dialog.confirm': '确定',
			'dialog.renameTitle': '重命名会话',
			'dialog.projectTitle': '把项目加入分组',
			'dialog.projectTarget': '项目',
			'dialog.projectPick': '为该项目下的所有会话选择一个分组',
		};

		/* ------------------------------ state ------------------------------ */

		/** `sidebar` remembers which browser the left column shows; `collapsed` folds groups. */
		const EMPTY_STATE = { sections: [], assignments: {}, sidebar: 'host', collapsed: {}, revealed: {}, seen: {} };

		function isRecord(value) {
			return typeof value === 'object' && value !== null;
		}

		function textOf(value) {
			return typeof value === 'string' ? value : '';
		}

		function normalizeSection(raw, index) {
			if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '') return null;
			const name = textOf(raw.name).trim();
			return {
				id: raw.id,
				name: name === '' ? 'Section ' + String(index + 1) : name,
				createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
			};
		}

		function normalizeAssignment(raw) {
			if (!isRecord(raw) || typeof raw.sectionId !== 'string' || raw.sectionId === '') return null;
			return {
				sectionId: raw.sectionId,
				title: textOf(raw.title),
				cwd: textOf(raw.cwd),
				at: typeof raw.at === 'number' ? raw.at : Date.now(),
			};
		}

		/**
		 * Build a state the rest of the plugin can trust: unknown section links
		 * are dropped, so a corrupted entry degrades to "not in a section".
		 */
		function normalize(raw) {
			const sections = [];
			if (isRecord(raw) && Array.isArray(raw.sections)) {
				for (const item of raw.sections) {
					const section = normalizeSection(item, sections.length);
					if (section !== null && !sections.some((known) => known.id === section.id)) sections.push(section);
				}
			}
			const assignments = {};
			if (isRecord(raw) && isRecord(raw.assignments)) {
				for (const [sessionId, item] of Object.entries(raw.assignments)) {
					const assignment = normalizeAssignment(item);
					if (assignment === null) continue;
					if (!sections.some((section) => section.id === assignment.sectionId)) continue;
					assignments[sessionId] = assignment;
				}
			}
			const collapsed = {};
			if (isRecord(raw) && isRecord(raw.collapsed)) {
				for (const [key, value] of Object.entries(raw.collapsed)) {
					if (key !== '' && value === true) collapsed[key] = true;
				}
			}
			const revealed = {};
			if (isRecord(raw) && isRecord(raw.revealed)) {
				for (const [key, value] of Object.entries(raw.revealed)) {
					if (key !== '' && typeof value === 'number' && Number.isFinite(value) && value > 0) revealed[key] = value;
				}
			}
			const seen = {};
			if (isRecord(raw) && isRecord(raw.seen)) {
				for (const [sessionId, value] of Object.entries(raw.seen)) {
					if (sessionId !== '' && typeof value === 'number' && Number.isFinite(value)) seen[sessionId] = value;
				}
			}
			const sidebar = isRecord(raw) && raw.sidebar === 'sections' ? 'sections' : 'host';
			return { sections, assignments, sidebar, collapsed, revealed, seen };
		}

		function loadState() {
			try {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				return raw === null ? EMPTY_STATE : normalize(JSON.parse(raw));
			} catch (error) {
				console.warn('[dsh-section] could not read local state', error);
				return EMPTY_STATE;
			}
		}

		let state = loadState();
		const stateListeners = new Set();

		function subscribeState(listener) {
			stateListeners.add(listener);
			return () => {
				stateListeners.delete(listener);
			};
		}

		function readState() {
			return state;
		}

		function useSectionState() {
			return React.useSyncExternalStore(subscribeState, readState);
		}

		function setState(next) {
			// Every write funnels through normalize, so the in-memory state always has
			// the full shape (sections, assignments, sidebar, collapsed) even if a
			// caller hands over a partial object.
			state = normalize(next);
			try {
				// Show more is view state: a fresh page starts each group on its first page.
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, revealed: {} }));
			} catch (error) {
				console.warn('[dsh-section] could not persist local state', error);
			}
			for (const listener of [...stateListeners]) listener();
		}

		function nextSectionId() {
			return 'sec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
		}

		/** @returns {string} the id of the created section. */
		function createSection(name) {
			const trimmed = textOf(name).trim();
			const section = {
				id: nextSectionId(),
				name: trimmed === '' ? 'Section ' + String(state.sections.length + 1) : trimmed,
				createdAt: Date.now(),
			};
			setState({ ...state, sections: [...state.sections, section] });
			return section.id;
		}

		function renameSection(sectionId, name) {
			const trimmed = textOf(name).trim();
			if (trimmed === '') return;
			setState({
				...state,
				sections: state.sections.map((section) => (section.id === sectionId ? { ...section, name: trimmed } : section)),
			});
		}

		function removeSection(sectionId) {
			const assignments = {};
			for (const [sessionId, assignment] of Object.entries(state.assignments)) {
				if (assignment.sectionId !== sectionId) assignments[sessionId] = assignment;
			}
			// Spread the current state: a bare { sections, assignments } would drop
			// `sidebar` (killing section mode) and the collapse map.
			setState({ ...state, sections: state.sections.filter((section) => section.id !== sectionId), assignments });
		}

		/** Move one session into a section, keeping whatever title/cwd is already known. */
		function assignSession(sessionId, sectionId, info) {
			const known = state.assignments[sessionId];
			const next = {
				sectionId,
				title: textOf(info && info.title) || textOf(known && known.title),
				cwd: textOf(info && info.cwd) || textOf(known && known.cwd),
				at: Date.now(),
			};
			setState({ ...state, assignments: { ...state.assignments, [sessionId]: next } });
		}

		function unassignSession(sessionId) {
			if (!(sessionId in state.assignments)) return;
			const assignments = { ...state.assignments };
			delete assignments[sessionId];
			setState({ ...state, assignments });
		}

		/** Drop assignments whose session no longer exists. @returns {number} removed count. */
		function forgetMissingSessions(liveIds) {
			const live = new Set(liveIds);
			const assignments = {};
			let removed = 0;
			for (const [sessionId, assignment] of Object.entries(state.assignments)) {
				if (live.has(sessionId)) assignments[sessionId] = assignment;
				else removed += 1;
			}
			if (removed > 0) setState({ ...state, assignments });
			return removed;
		}

		/**
		 * Choose which browser the left column shows. `sections` mounts this
		 * plugin's tree over the shipped browser; `host` is the shipped behavior.
		 */
		function setSidebarMode(mode) {
			const next = mode === 'sections' ? 'sections' : 'host';
			if (state.sidebar === next) return;
			setState({ ...state, sidebar: next });
		}

		function toggleCollapsed(key) {
			const collapsed = { ...state.collapsed };
			if (collapsed[key] === true) delete collapsed[key];
			else collapsed[key] = true;
			// Folding a group away also drops how far it had been unfolded.
			const revealed = { ...state.revealed };
			delete revealed[key];
			setState({ ...state, collapsed, revealed });
		}

		/**
		 * How much of one group is on screen: the first GROUP_PAGE rows, plus one
		 * more page per Show more click, until the whole group is visible. The
		 * counts live with the collapse flags so a group keeps its page.
		 */
		function groupPage(snapshot, key, total) {
			const shown = snapshot.revealed[key];
			const wanted = typeof shown === 'number' && Number.isFinite(shown) ? shown : GROUP_PAGE;
			const count = Math.min(total, Math.max(GROUP_PAGE, wanted));
			return { count, more: total > count, key, total };
		}

		function revealGroup(key, total) {
			setState({ ...state, revealed: { ...state.revealed, [key]: groupPage(state, key, total).count + GROUP_PAGE } });
		}

		/** Remember that the operator has looked at this session up to `stamp`. */
		function markSeen(sessionId, stamp) {
			if (sessionId === '' || typeof stamp !== 'number' || stamp <= 0) return;
			const known = state.seen[sessionId];
			if (typeof known === 'number' && known >= stamp) return;
			setState({ ...state, seen: { ...state.seen, [sessionId]: stamp } });
		}

		/** Baseline every session once, and keep the open conversation marked read. */
		function syncSeen(snapshot) {
			if (!isRecord(snapshot) || !Array.isArray(snapshot.ids)) return;
			const seen = { ...state.seen };
			let changed = false;
			for (const sessionId of snapshot.ids) {
				if (typeof seen[sessionId] === 'number') continue;
				const stamp = sessionStamp(sessionId);
				if (stamp > 0) {
					seen[sessionId] = stamp;
					changed = true;
				}
			}
			if (typeof snapshot.current === 'string' && snapshot.current !== '') {
				const stamp = sessionStamp(snapshot.current);
				const known = seen[snapshot.current];
				if (stamp > 0 && (typeof known !== 'number' || known < stamp)) {
					seen[snapshot.current] = stamp;
					changed = true;
				}
			}
			if (changed) setState({ ...state, seen });
		}

		function membersOf(snapshot, sectionId) {
			const members = [];
			for (const [sessionId, assignment] of Object.entries(snapshot.assignments)) {
				if (assignment.sectionId === sectionId) members.push({ sessionId, assignment });
			}
			members.sort((left, right) => right.assignment.at - left.assignment.at);
			return members;
		}

		/* --------------------------- host services --------------------------- */

		const services = { sessions: null, workspaces: null, uiWorkspace: null };

		function sessionsSnapshot() {
			try {
				return services.sessions === null ? undefined : services.sessions.list.getSnapshot();
			} catch (error) {
				console.warn('[dsh-section] could not read the session list', error);
				return undefined;
			}
		}

		function subscribeSessions(listener) {
			if (services.sessions === null) return () => {};
			return services.sessions.list.subscribe(listener);
		}

		function useSessionsSnapshot() {
			return React.useSyncExternalStore(subscribeSessions, sessionsSnapshot);
		}

		function liveSessionIds() {
			const snapshot = sessionsSnapshot();
			return isRecord(snapshot) && Array.isArray(snapshot.ids) ? snapshot.ids : [];
		}

		function firstText(...values) {
			for (const value of values) if (typeof value === 'string' && value !== '') return value;
			return '';
		}

		/**
		 * Read what the sidebar shows for a session without depending on the exact
		 * SessionSummary fields: titles and cwd are read from several known names
		 * and fall back to whatever the plugin recorded when the session was filed.
		 */
		/** The list entry for one session; the exact SessionSummary fields are read defensively. */
		function sessionSummary(sessionId) {
			const snapshot = sessionsSnapshot();
			return isRecord(snapshot) && isRecord(snapshot.byId) ? snapshot.byId[sessionId] : undefined;
		}

		/** Last-activity stamp of one session; 0 while the list has no entry for it. */
		function sessionStamp(sessionId) {
			const summary = sessionSummary(sessionId);
			const stamp = summary && summary.updatedAt;
			if (typeof stamp === 'number' && Number.isFinite(stamp)) return stamp;
			// The list may hand out an ISO timestamp instead of a millisecond number.
			if (typeof stamp === 'string') {
				const parsed = Date.parse(stamp);
				if (Number.isFinite(parsed)) return parsed;
			}
			return 0;
		}

		/** True while the host reports live work for this session. */
		function sessionRunning(sessionId) {
			const summary = sessionSummary(sessionId);
			return isRecord(summary) && summary.running === true;
		}

		/**
		 * Trailing status of one Session row: live work wins, then a completion the
		 * operator has not looked at yet. An empty result leaves the cell to the menu.
		 */
		function sessionRowStatus(snapshot, sessionId) {
			if (sessionRunning(sessionId)) return 'running';
			const summary = sessionSummary(sessionId);
			if (!isRecord(summary) || summary.blank === true) return '';
			const mark = isRecord(snapshot) && isRecord(snapshot.seen) ? snapshot.seen[sessionId] : undefined;
			const stamp = sessionStamp(sessionId);
			return typeof mark === 'number' && stamp > mark ? 'unread' : '';
		}

		function describeSession(sessionId, fallback) {
			const summary = sessionSummary(sessionId);
			const ids = liveSessionIds();
			return {
				sessionId,
				title: firstText(
					summary && summary.displayTitle,
					summary && summary.title,
					summary && summary.name,
					fallback && fallback.title,
				),
				cwd: firstText(
					summary && summary.cwd,
					summary && summary.workspacePath,
					summary && summary.path,
					fallback && fallback.cwd,
				),
				missing: ids.length > 0 && !ids.includes(sessionId),
			};
		}

		function projectLabel(cwd) {
			if (cwd === '') return '';
			const parts = cwd.split(/[\\/]+/).filter((part) => part !== '');
			return parts.length === 0 ? cwd : parts[parts.length - 1];
		}

		function showSession(sessionId) {
			markSeen(sessionId, sessionStamp(sessionId));
			if (services.uiWorkspace === null) return;
			try {
				services.uiWorkspace.openSession(sessionId);
			} catch (error) {
				console.warn('[dsh-section] could not open the session', error);
			}
		}

		function startSessionIn(workspaceId) {
			if (services.uiWorkspace === null) return;
			try {
				services.uiWorkspace.startSession(workspaceId);
			} catch (error) {
				console.warn('[dsh-section] could not start a session', error);
			}
		}

		/** Add a project the way the host does: pick a directory, then register it. */
		async function addProject() {
			if (services.uiWorkspace === null || services.workspaces === null) return;
			try {
				const path = await services.uiWorkspace.pickDirectory();
				if (typeof path !== 'string' || path === '') return;
				const view = await services.workspaces.create({ path });
				const workspaceId = isRecord(view) ? view.workspaceId : undefined;
				if (workspaceId !== undefined && typeof services.uiWorkspace.openWorkspace === 'function') {
					services.uiWorkspace.openWorkspace(workspaceId);
				}
			} catch (error) {
				console.warn('[dsh-section] could not add a project', error);
			}
		}

		/** Hide a session; an archived session keeps its assignment for later. */
		function archiveSession(sessionId) {
			if (services.uiWorkspace === null || typeof services.uiWorkspace.archiveSession !== 'function') return;
			try {
				Promise.resolve(services.uiWorkspace.archiveSession(sessionId)).catch((error) => {
					console.warn('[dsh-section] could not archive the session', error);
				});
			} catch (error) {
				console.warn('[dsh-section] could not archive the session', error);
			}
		}

		/**
		 * Rename a session through its retained binding: the client service has no
		 * direct setter, so the session is borrowed for the length of the call.
		 */
		function renameSession(sessionId, title) {
			const trimmed = title.trim();
			if (trimmed === '' || services.sessions === null || typeof services.sessions.retain !== 'function') return;
			let reference = null;
			try {
				reference = services.sessions.retain(sessionId, { source: 'dsh-section' });
			} catch (error) {
				console.warn('[dsh-section] could not borrow the session', error);
				return;
			}
			Promise.resolve(reference.ready)
				.then((binding) => binding.session.rename(trimmed))
				.catch((error) => {
					console.warn('[dsh-section] could not rename the session', error);
				})
				.then(() => {
					try {
						reference.release();
					} catch (error) {
						console.warn('[dsh-section] could not release the session', error);
					}
				});
		}

		/** Take a whole project out of the sidebar; its sessions keep their sections. */
		function archiveProject(workspaceId) {
			if (workspaceId === null || services.workspaces === null || typeof services.workspaces.delete !== 'function') return;
			try {
				Promise.resolve(services.workspaces.delete(workspaceId)).catch((error) => {
					console.warn('[dsh-section] could not archive the project', error);
				});
			} catch (error) {
				console.warn('[dsh-section] could not archive the project', error);
			}
		}

		/* ------------------------- move-to-section dialog ------------------------- */

		let pendingTarget = null;
		const pendingListeners = new Set();

		function subscribePending(listener) {
			pendingListeners.add(listener);
			return () => {
				pendingListeners.delete(listener);
			};
		}

		function readPending() {
			return pendingTarget;
		}

		function setPendingTarget(target) {
			pendingTarget = target;
			for (const listener of [...pendingListeners]) listener();
		}

		/* ---------------------------- pending rename ---------------------------- */

		/** `{ sessionId, title }`: one session is being renamed from a dropdown. */
		let renameTarget = null;
		const renameListeners = new Set();

		function subscribeRename(listener) {
			renameListeners.add(listener);
			return () => {
				renameListeners.delete(listener);
			};
		}

		function readRename() {
			return renameTarget;
		}

		function setRenameTarget(target) {
			renameTarget = target;
			for (const listener of [...renameListeners]) listener();
		}

		/* ---------------------------- pending project ---------------------------- */

		/** `{ name, sessions: [{ sessionId, title, cwd }] }` for the bulk assign flow. */
		let projectTarget = null;
		const projectListeners = new Set();

		function subscribeProject(listener) {
			projectListeners.add(listener);
			return () => {
				projectListeners.delete(listener);
			};
		}

		function readProject() {
			return projectTarget;
		}

		function setProjectTarget(target) {
			projectTarget = target;
			for (const listener of [...projectListeners]) listener();
		}

		/* ------------------------------- dropdown ------------------------------- */

		/**
		 * The open dropdown, rendered by the `shell.overlay` entry so it hovers above
		 * the sidebar instead of pushing a row into it:
		 * `{ token, ownerKey, anchor: { top, bottom, right }, items }`.
		 */
		let dropdown = null;
		let dropdownToken = 0;
		const dropdownListeners = new Set();

		function subscribeDropdown(listener) {
			dropdownListeners.add(listener);
			return () => {
				dropdownListeners.delete(listener);
			};
		}

		function readDropdown() {
			return dropdown;
		}

		function setDropdown(next) {
			dropdown = next;
			for (const listener of [...dropdownListeners]) listener();
		}

		function closeDropdown() {
			if (dropdown !== null) setDropdown(null);
		}

		/** Toggle one trigger's dropdown; the trigger passes its own rect. */
		function toggleDropdown(ownerKey, anchor, items) {
			if (dropdown !== null && dropdown.ownerKey === ownerKey) {
				closeDropdown();
				return;
			}
			dropdownToken += 1;
			setDropdown({ token: dropdownToken, ownerKey, anchor, items });
		}

		/* ------------------------------- styles ------------------------------- */

		const SECTION_COLORS = [
			'var(--dsw-alias-brand-primary)',
			'var(--dsw-alias-state-success-primary)',
			'var(--dsw-alias-state-warn-primary)',
			'var(--dsw-alias-state-error-primary)',
			'var(--dsw-alias-state-idle-primary)',
		];

		function sectionColor(sectionId) {
			const index = state.sections.findIndex((section) => section.id === sectionId);
			return SECTION_COLORS[(index < 0 ? 0 : index) % SECTION_COLORS.length];
		}

		const HOVER_CLASS = 'dsh-section-hover';
		/* Rows reveal their trailing actions on hover/focus; both classes live in GLOBAL_CSS. */
		const ROW_CLASS = 'dsh-section-row';
		const REVEAL_CLASS = 'dsh-section-reveal';

		const S = {
			panel: {
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				minHeight: 0,
				background: 'var(--dsw-alias-bg-base)',
				color: 'var(--dsw-alias-label-primary)',
				fontSize: 13,
			},
			header: {
				display: 'flex',
				alignItems: 'flex-start',
				justifyContent: 'space-between',
				gap: 12,
				padding: '16px 20px',
				borderBottom: '1px solid var(--dsw-alias-border-l1)',
			},
			title: { margin: 0, fontSize: 15, fontWeight: 600 },
			hint: { margin: '4px 0 0', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
			body: { display: 'flex', flex: '1 1 auto', minHeight: 0 },
			list: {
				flex: '0 0 220px',
				width: 220,
				borderRight: '1px solid var(--dsw-alias-border-l1)',
				overflowY: 'auto',
				padding: 8,
				display: 'flex',
				flexDirection: 'column',
				gap: 2,
			},
			listRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 8 },
			listRowActive: {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				padding: '4px 6px',
				borderRadius: 8,
				background: 'var(--dsw-alias-bg-layer-2)',
			},
			dot: { flex: '0 0 auto', width: 8, height: 8, borderRadius: '50%' },
			listRowButton: {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				flex: '1 1 auto',
				minWidth: 0,
				background: 'transparent',
				border: 'none',
				padding: '4px 2px',
				color: 'inherit',
				font: 'inherit',
				textAlign: 'left',
				cursor: 'pointer',
			},
			listRowName: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
			count: { flex: '0 0 auto', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
			rowTools: { display: 'flex', gap: 4, padding: '0 6px 6px' },
			detail: { flex: '1 1 auto', minWidth: 0, overflowY: 'auto', padding: 20 },
			detailHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
			detailTitle: { fontSize: 14, fontWeight: 600 },
			actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
			placeholder: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 },
			button: {
				background: 'var(--dsw-alias-bg-layer-2)',
				border: '1px solid var(--dsw-alias-border-l1)',
				borderRadius: 8,
				padding: '5px 10px',
				color: 'var(--dsw-alias-label-primary)',
				font: 'inherit',
				cursor: 'pointer',
			},
			buttonPrimary: {
				background: 'var(--dsw-alias-brand-primary)',
				border: '1px solid transparent',
				borderRadius: 8,
				padding: '5px 12px',
				color: 'var(--dsw-alias-bg-base)',
				font: 'inherit',
				fontWeight: 600,
				cursor: 'pointer',
			},
			buttonDanger: {
				background: 'transparent',
				border: '1px solid var(--dsw-alias-border-l1)',
				borderRadius: 8,
				padding: '4px 8px',
				color: 'var(--dsw-alias-state-error-primary)',
				font: 'inherit',
				cursor: 'pointer',
			},
			buttonGhost: {
				background: 'transparent',
				border: '1px solid transparent',
				borderRadius: 8,
				padding: '4px 8px',
				color: 'var(--dsw-alias-label-secondary)',
				font: 'inherit',
				cursor: 'pointer',
			},
			input: {
				flex: '1 1 auto',
				minWidth: 0,
				background: 'var(--dsw-alias-bg-layer-1)',
				border: '1px solid var(--dsw-alias-border-l2)',
				borderRadius: 8,
				padding: '5px 8px',
				color: 'var(--dsw-alias-label-primary)',
				font: 'inherit',
			},
			notice: {
				margin: '12px 20px 0',
				padding: '6px 10px',
				borderRadius: 8,
				fontSize: 12,
				background: 'var(--dsw-alias-bg-layer-2)',
				color: 'var(--dsw-alias-label-secondary)',
			},
			members: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 },
			member: {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				padding: '8px 10px',
				border: '1px solid var(--dsw-alias-border-l1)',
				borderRadius: 10,
			},
			memberMain: { flex: '1 1 auto', minWidth: 0 },
			memberTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
			memberMeta: { marginTop: 2, fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
			picker: {
				marginTop: 12,
				border: '1px solid var(--dsw-alias-border-l1)',
				borderRadius: 10,
				overflow: 'hidden',
			},
			pickerHead: { padding: 8, borderBottom: '1px solid var(--dsw-alias-border-l1)' },
			pickerList: { maxHeight: 240, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 },
			pickerRow: {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				width: '100%',
				background: 'transparent',
				border: 'none',
				borderRadius: 8,
				padding: '6px 8px',
				color: 'var(--dsw-alias-label-primary)',
				font: 'inherit',
				textAlign: 'left',
				cursor: 'pointer',
			},
			menuItem: {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				width: '100%',
				background: 'transparent',
				border: 'none',
				borderRadius: 6,
				padding: '6px 10px',
				color: 'var(--dsw-alias-label-primary)',
				font: 'inherit',
				textAlign: 'left',
				cursor: 'pointer',
			},
			backdrop: {
				position: 'fixed',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'var(--dsw-alias-bg-overlay)',
				pointerEvents: 'auto',
			},
			dialog: {
				width: 380,
				maxWidth: 'calc(100vw - 48px)',
				maxHeight: 'calc(100vh - 96px)',
				overflowY: 'auto',
				background: 'var(--dsw-alias-bg-layer-1)',
				border: '1px solid var(--dsw-alias-border-l2)',
				borderRadius: 12,
				padding: 18,
				color: 'var(--dsw-alias-label-primary)',
				fontSize: 13,
				boxShadow: '0 12px 32px var(--dsw-alias-bg-overlay)',
			},
			dialogTitle: { margin: '0 0 12px', fontSize: 14, fontWeight: 600 },
			dialogTarget: {
				padding: '8px 10px',
				borderRadius: 8,
				background: 'var(--dsw-alias-bg-layer-2)',
				marginBottom: 12,
			},
			dialogLabel: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', margin: '0 0 6px' },
			option: {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				width: '100%',
				background: 'transparent',
				border: '1px solid transparent',
				borderRadius: 8,
				padding: '6px 8px',
				color: 'var(--dsw-alias-label-primary)',
				font: 'inherit',
				textAlign: 'left',
				cursor: 'pointer',
			},
			optionActive: {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				width: '100%',
				background: 'var(--dsw-alias-bg-layer-2)',
				border: '1px solid var(--dsw-alias-border-l2)',
				borderRadius: 8,
				padding: '6px 8px',
				color: 'var(--dsw-alias-label-primary)',
				font: 'inherit',
				textAlign: 'left',
				cursor: 'pointer',
			},
			dialogFooter: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
			stack: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 },
			browser: {
				display: 'flex',
				flexDirection: 'column',
				gap: 2,
				height: '100%',
				minHeight: 0,
				overflowY: 'auto',
				padding: '2px 6px 10px',
				color: 'var(--dsw-alias-label-primary)',
				fontSize: 13,
			},
			browserBar: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 2px 6px' },
			browserBarTitle: {
				flex: '1 1 auto',
				minWidth: 0,
				fontSize: 12,
				fontWeight: 600,
				color: 'var(--dsw-alias-label-secondary)',
			},
			browserFilter: { padding: '0 2px 6px' },
			areaBar: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 2px 4px' },
			divider: { height: 1, margin: '6px 2px', background: 'var(--dsw-alias-border-l1)' },
			iconButton: {
				flex: '0 0 auto',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: 22,
				height: 22,
				background: 'transparent',
				border: 'none',
				borderRadius: 6,
				padding: 0,
				color: 'var(--dsw-alias-label-secondary)',
				font: 'inherit',
				cursor: 'pointer',
			},
			group: { display: 'flex', flexDirection: 'column' },
			groupHeader: { display: 'flex', alignItems: 'center', gap: 2, minHeight: 26, borderRadius: 6 },
			groupActions: { flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 2 },
			groupToggle: {
				display: 'flex',
				alignItems: 'center',
				gap: 6,
				flex: '1 1 auto',
				minWidth: 0,
				background: 'transparent',
				border: 'none',
				borderRadius: 6,
				padding: '4px 4px',
				color: 'inherit',
				font: 'inherit',
				textAlign: 'left',
				cursor: 'pointer',
			},
			chevron: {
				flex: '0 0 auto',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: 10,
				color: 'var(--dsw-alias-label-secondary)',
			},
			groupName: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
			groupBody: { display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 16 },
			moreRow: {
				display: 'block',
				width: '100%',
				textAlign: 'left',
				padding: '4px 8px',
				background: 'transparent',
				border: 'none',
				borderRadius: 6,
				color: 'var(--dsw-alias-label-secondary)',
				font: 'inherit',
				fontSize: 12,
				cursor: 'pointer',
			},
			menuBackdrop: { position: 'fixed', inset: 0, pointerEvents: 'auto', zIndex: 60 },
			menuPanel: {
				position: 'fixed',
				width: SECTION_MENU_WIDTH,
				display: 'flex',
				flexDirection: 'column',
				gap: 1,
				padding: 4,
				background: 'var(--dsw-alias-bg-layer-1)',
				border: '1px solid var(--dsw-alias-border-l2)',
				borderRadius: 8,
				boxShadow: '0 12px 32px var(--dsw-alias-bg-overlay)',
				outline: 'none',
				pointerEvents: 'auto',
				zIndex: 61,
			},
			menuItem: {
				display: 'block',
				width: '100%',
				padding: '6px 8px',
				border: 'none',
				borderRadius: 6,
				background: 'transparent',
				color: 'var(--dsw-alias-label-primary)',
				font: 'inherit',
				fontSize: 12,
				textAlign: 'left',
				cursor: 'pointer',
			},
			menuItemDanger: {
				display: 'block',
				width: '100%',
				padding: '6px 8px',
				border: 'none',
				borderRadius: 6,
				background: 'transparent',
				color: 'var(--dsw-alias-state-error-primary)',
				font: 'inherit',
				fontSize: 12,
				textAlign: 'left',
				cursor: 'pointer',
			},
			sidebarHint: { padding: '4px 6px', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
			sessionRow: { display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6 },
			sessionOpen: {
				display: 'flex',
				alignItems: 'center',
				gap: 6,
				flex: '1 1 auto',
				minWidth: 0,
				background: 'transparent',
				border: 'none',
				borderRadius: 6,
				padding: '4px 4px',
				color: 'inherit',
				font: 'inherit',
				textAlign: 'left',
				cursor: 'pointer',
			},
			sessionTitle: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
			sessionTag: { flex: '0 0 auto', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
			sessionWarn: { flex: '0 0 auto', fontSize: 11, color: 'var(--dsw-alias-state-warn-primary)' },
			rowTrail: { position: 'relative', flex: '0 0 auto', width: 20, height: 20 },
			rowStatus: {
				position: 'absolute',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				pointerEvents: 'none',
			},
			unreadDot: { width: 8, height: 8, borderRadius: '50%', background: UNREAD_COLOR },
			rowMore: {
				position: 'absolute',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 0,
				border: 'none',
				borderRadius: 6,
				background: 'transparent',
				color: 'var(--dsw-alias-label-secondary)',
				cursor: 'pointer',
			},
			rail: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '6px 0' },
			railButton: {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: 30,
				height: 30,
				background: 'transparent',
				border: 'none',
				borderRadius: 8,
				padding: 0,
				color: 'var(--dsw-alias-label-primary)',
				cursor: 'pointer',
			},
			switchRow: {
				display: 'flex',
				alignItems: 'flex-start',
				gap: 10,
				margin: '12px 20px 0',
				padding: '10px 12px',
				border: '1px solid var(--dsw-alias-border-l1)',
				borderRadius: 10,
			},
			switch: {
				flex: '0 0 auto',
				position: 'relative',
				width: 32,
				height: 18,
				marginTop: 1,
				background: 'var(--dsw-alias-border-l2)',
				border: '1px solid var(--dsw-alias-border-l2)',
				borderRadius: 999,
				padding: 0,
				cursor: 'pointer',
			},
			switchOn: {
				flex: '0 0 auto',
				position: 'relative',
				width: 32,
				height: 18,
				marginTop: 1,
				background: 'var(--dsw-alias-brand-primary)',
				border: '1px solid var(--dsw-alias-brand-primary)',
				borderRadius: 999,
				padding: 0,
				cursor: 'pointer',
			},
			switchKnob: {
				position: 'absolute',
				top: 1,
				left: 1,
				width: 14,
				height: 14,
				borderRadius: '50%',
				background: 'var(--dsw-alias-label-secondary)',
			},
			switchKnobOn: {
				position: 'absolute',
				top: 1,
				left: 15,
				width: 14,
				height: 14,
				borderRadius: '50%',
				background: 'var(--dsw-alias-bg-base)',
			},
			switchText: { flex: '1 1 auto', minWidth: 0 },
			switchLabel: { display: 'block', fontSize: 13 },
			switchHint: { display: 'block', marginTop: 2, fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
		};

		/* Hover/focus feedback for the plugin's own controls (inline styles cannot express pseudo-classes). */
		const GLOBAL_CSS =
			'.' +
			HOVER_CLASS +
			':hover{background:var(--dsw-alias-bg-layer-2)}' +
			'.' +
			HOVER_CLASS +
			':focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}' +
			'.' +
			REVEAL_CLASS +
			'{opacity:0;transition:opacity .12s ease}' +
			'.' +
			ROW_CLASS +
			':hover .' +
			REVEAL_CLASS +
			',.' +
			ROW_CLASS +
			':focus-within .' +
			REVEAL_CLASS +
			',.' +
			REVEAL_CLASS +
			':focus-visible{opacity:1}' +
			'.dsh-section-status{transition:opacity .12s ease}' +
			'.' + ROW_CLASS + ':hover .dsh-section-status,.' + ROW_CLASS + ':focus-within .dsh-section-status{opacity:0}' +
			'.dsh-section-spinner{display:block;transform-origin:center;animation:dsh-section-spin .8s linear infinite}' +
			'@keyframes dsh-section-spin{to{transform:rotate(360deg)}}';

		/* ----------------------------- panel view ----------------------------- */

		function SectionRow({ section, selected, count, t, onSelect, onRename, onDelete }) {
			const [editing, setEditing] = React.useState(false);
			const [draft, setDraft] = React.useState(section.name);
			const [confirming, setConfirming] = React.useState(false);

			function commit() {
				setEditing(false);
				onRename(draft);
			}

			if (editing) {
				return h(
					'div',
					{ style: S.listRow },
					h('input', {
						autoFocus: true,
						style: S.input,
						value: draft,
						onChange: (event) => setDraft(event.target.value),
						onKeyDown: (event) => {
							if (event.key === 'Enter') commit();
							if (event.key === 'Escape') {
								setDraft(section.name);
								setEditing(false);
							}
						},
						onBlur: commit,
					}),
				);
			}

			return h(
				'div',
				{ key: section.id },
				h(
					'div',
					{ style: selected ? S.listRowActive : S.listRow },
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.listRowButton,
							onClick: () => onSelect(section.id),
						},
						h('span', { style: { ...S.dot, background: sectionColor(section.id) } }),
						h('span', { style: S.listRowName }, section.name),
						h('span', { style: S.count }, String(count)),
					),
				),
				selected
					? h(
							'div',
							{ style: S.rowTools },
							h(
								'button',
								{
									type: 'button',
									className: HOVER_CLASS,
									style: S.buttonGhost,
									onClick: () => {
										setDraft(section.name);
										setEditing(true);
									},
								},
								t('panel.rename'),
							),
							h(
								'button',
								{
									type: 'button',
									className: HOVER_CLASS,
									style: confirming ? S.buttonDanger : S.buttonGhost,
									onClick: () => {
										if (confirming) onDelete(section.id);
										else setConfirming(true);
									},
									onBlur: () => setConfirming(false),
								},
								confirming ? t('panel.confirmDelete') : t('panel.delete'),
							),
						)
					: null,
			);
		}

		function SessionPicker({ snapshot, sectionId, t, onClose }) {
			const [query, setQuery] = React.useState('');
			const needle = query.trim().toLowerCase();
			const candidates = liveSessionIds()
				.map((sessionId) => describeSession(sessionId, snapshot.assignments[sessionId]))
				.filter((info) => {
					const haystack = (info.title + ' ' + info.cwd).toLowerCase();
					return needle === '' || haystack.includes(needle) || info.sessionId.toLowerCase().includes(needle);
				});
			const shown = candidates.slice(0, PICKER_LIMIT);

			return h(
				'div',
				{ style: S.picker },
				h(
					'div',
					{ style: S.pickerHead },
					h('input', {
						autoFocus: true,
						style: { ...S.input, width: '100%' },
						placeholder: t('panel.pickerPlaceholder'),
						value: query,
						onChange: (event) => setQuery(event.target.value),
						onKeyDown: (event) => {
							if (event.key === 'Escape') onClose();
						},
					}),
				),
				shown.length === 0
					? h('div', { style: { ...S.placeholder, padding: 12 } }, t('panel.pickerEmpty'))
					: h(
							'div',
							{ style: S.pickerList },
							shown.map((info) => {
								const here = snapshot.assignments[info.sessionId] !== undefined && snapshot.assignments[info.sessionId].sectionId === sectionId;
								return h(
									'button',
									{
										key: info.sessionId,
										type: 'button',
										className: HOVER_CLASS,
										style: S.pickerRow,
										onClick: () => {
											assignSession(info.sessionId, sectionId, info);
											onClose();
										},
									},
									h('span', { style: { ...S.dot, background: sectionColor(sectionId) } }),
									h(
										'span',
										{ style: S.listRowName },
										info.title === '' ? info.sessionId.slice(0, 10) : info.title,
									),
									h(
										'span',
										{ style: S.count },
										[projectLabel(info.cwd), here ? t('panel.inSection') : '', info.missing ? t('panel.missing') : '']
											.filter((part) => part !== '')
											.join(' · '),
									),
								);
							}),
							candidates.length > PICKER_LIMIT ? h('div', { style: { ...S.placeholder, padding: '6px 8px' } }, t('panel.more')) : null,
						),
			);
		}

		function SectionsPanel({ t }) {
			const snapshot = useSectionState();
			useSessionsSnapshot();
			const [selectedId, setSelectedId] = React.useState(null);
			const [pickerOpen, setPickerOpen] = React.useState(false);
			const [notice, setNotice] = React.useState('');

			const sections = snapshot.sections;
			const selected = sections.some((section) => section.id === selectedId)
				? selectedId
				: sections.length > 0
					? sections[0].id
					: null;
			const current = sections.find((section) => section.id === selected) || null;
			const members = current === null ? [] : membersOf(snapshot, current.id);

			function handleCreate() {
				const id = createSection(t('panel.defaultName') + ' ' + String(sections.length + 1));
				setSelectedId(id);
			}

			function handleCleanup() {
				const removed = forgetMissingSessions(liveSessionIds());
				setNotice(removed === 0 ? t('panel.cleanup') + ': 0' : t('panel.cleaned') + ' ' + String(removed));
			}

			return h(
				'div',
				{ style: S.panel },
				h(
					'div',
					{ style: S.header },
					h('div', null, h('h1', { style: S.title }, t('panel.title')), h('p', { style: S.hint }, t('panel.subtitle'))),
					h(
						'div',
						{ style: S.actions },
						h('button', { type: 'button', className: HOVER_CLASS, style: S.buttonPrimary, onClick: handleCreate }, t('panel.new')),
					),
				),
				h(SidebarModeSwitch, { t }),
				notice === ''
					? null
					: h(
							'div',
							{ style: S.notice },
							notice,
							h(
								'button',
								{
									type: 'button',
									style: { ...S.buttonGhost, marginLeft: 8, padding: '0 6px' },
									onClick: () => setNotice(''),
								},
								'×',
							),
						),
				h(
					'div',
					{ style: S.body },
					h(
						'div',
						{ style: S.list },
						sections.length === 0
							? h('p', { style: { ...S.placeholder, padding: '8px 6px' } }, t('panel.empty'))
							: sections.map((section) =>
									h(SectionRow, {
										key: section.id,
										section,
										selected: section.id === selected,
										count: membersOf(snapshot, section.id).length,
										t,
										onSelect: setSelectedId,
										onRename: (name) => renameSection(section.id, name),
										onDelete: (id) => {
											removeSection(id);
											setNotice('');
										},
									}),
								),
					),
					h(
						'div',
						{ style: S.detail },
						current === null
							? h('div', { style: S.placeholder }, h('p', null, t('panel.empty')), h('p', null, t('panel.emptyHint')))
							: h(
									React.Fragment,
									null,
									h(
										'div',
										{ style: S.detailHeader },
										h(
											'div',
											null,
											h('div', { style: S.detailTitle }, current.name),
											h('p', { style: S.hint }, String(members.length) + ' ' + t('panel.unitSessions')),
										),
										h(
											'div',
											{ style: S.actions },
											h(
												'button',
												{
													type: 'button',
													className: HOVER_CLASS,
													style: S.button,
													onClick: () => setPickerOpen((open) => !open),
												},
												t('panel.addSession'),
											),
											h(
												'button',
												{ type: 'button', className: HOVER_CLASS, style: S.button, onClick: handleCleanup },
												t('panel.cleanup'),
											),
										),
									),
									pickerOpen
										? h(SessionPicker, { snapshot, sectionId: current.id, t, onClose: () => setPickerOpen(false) })
										: null,
									members.length === 0
										? h('p', { style: { ...S.placeholder, marginTop: 14 } }, t('panel.noMembers'))
										: h(
												'div',
												{ style: S.members },
												members.map(({ sessionId, assignment }) => {
													const info = describeSession(sessionId, assignment);
													const meta = [
														projectLabel(info.cwd),
														info.missing ? t('panel.missing') : '',
													]
														.filter((part) => part !== '')
														.join(' · ');
													return h(
														'div',
														{ key: sessionId, style: S.member },
														h(
															'div',
															{ style: S.memberMain },
															h('div', { style: S.memberTitle }, info.title === '' ? t('panel.untitled') : info.title),
															meta === '' ? null : h('div', { style: S.memberMeta }, meta),
														),
														h(
															'button',
															{
																type: 'button',
																className: HOVER_CLASS,
																style: S.button,
																onClick: () => showSession(sessionId),
															},
															t('panel.open'),
														),
														h(
															'button',
															{
																type: 'button',
																className: HOVER_CLASS,
																style: S.buttonGhost,
																onClick: () => unassignSession(sessionId),
															},
															t('panel.remove'),
														),
													);
												}),
											),
								),
					),
				),
			);
		}

		/* ---------------------------- sidebar browser ---------------------------- */

		const SESSION_ROW_LIMIT = 200;
		/* Only the first page of a group renders; each Show more click adds one page. */
		const GROUP_PAGE = 5;

		function Chevron({ open }) {
			return h(
				'svg',
				{
					width: 10,
					height: 10,
					viewBox: '0 0 10 10',
					fill: 'none',
					stroke: 'currentColor',
					strokeWidth: 1.6,
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
					'aria-hidden': 'true',
				},
				h('path', { d: open ? 'M2.4 3.6 5 6.4 7.6 3.6' : 'M3.8 2.4 6.6 5 3.8 7.6' }),
			);
		}

		function SpinnerIcon() {
			return h(
				'svg',
				{
					className: 'dsh-section-spinner',
					width: 12,
					height: 12,
					viewBox: '0 0 12 12',
					fill: 'none',
					'aria-hidden': 'true',
				},
				h('circle', { cx: 6, cy: 6, r: 4.6, stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.4 }),
				h('path', {
					d: 'M6 1.4a4.6 4.6 0 0 1 4.6 4.6',
					stroke: UNREAD_COLOR,
					strokeWidth: 1.4,
					strokeLinecap: 'round',
				}),
			);
		}

		function SearchIcon({ size }) {
			const dimension = typeof size === 'number' && size > 0 ? size : 12;
			return h(
				'svg',
				{
					width: dimension,
					height: dimension,
					viewBox: '0 0 12 12',
					fill: 'none',
					stroke: 'currentColor',
					strokeWidth: 1.4,
					strokeLinecap: 'round',
					'aria-hidden': 'true',
				},
				h('circle', { cx: 5.2, cy: 5.2, r: 3.3 }),
				h('path', { d: 'M7.7 7.7 10.4 10.4' }),
			);
		}

		function PlusIcon({ size }) {
			const dimension = typeof size === 'number' && size > 0 ? size : 12;
			return h(
				'svg',
				{
					width: dimension,
					height: dimension,
					viewBox: '0 0 12 12',
					fill: 'none',
					stroke: 'currentColor',
					strokeWidth: 1.4,
					strokeLinecap: 'round',
					'aria-hidden': 'true',
				},
				h('path', { d: 'M6 2.4v7.2M2.4 6h7.2' }),
			);
		}

		function MoreIcon() {
			return h(
				'svg',
				{ width: 14, height: 14, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': 'true' },
				h('circle', { cx: 3.2, cy: 8, r: 1.3 }),
				h('circle', { cx: 8, cy: 8, r: 1.3 }),
				h('circle', { cx: 12.8, cy: 8, r: 1.3 }),
			);
		}

		/**
		 * Read the Workspace snapshot through the standard hook the sidebar passes
		 * to its occupant. The hook is optional, so an older host degrades to "no
		 * workspace groups" instead of throwing.
		 */
		function useWorkspaceState(useWorkspaces) {
			if (typeof useWorkspaces === 'function') return useWorkspaces((value) => value);
			return undefined;
		}

		function summaryOf(sessionId) {
			const snapshot = sessionsSnapshot();
			return isRecord(snapshot) && isRecord(snapshot.byId) ? snapshot.byId[sessionId] : undefined;
		}

		function summaryTitle(sessionId) {
			const summary = summaryOf(sessionId);
			return firstText(summary && summary.displayTitle, summary && summary.title, summary && summary.name);
		}

		function summaryCwd(sessionId) {
			const summary = summaryOf(sessionId);
			return firstText(summary && summary.cwd, summary && summary.workspacePath, summary && summary.path);
		}

		/** One session line: open on click, file/unfile through the revealed action. */
		/**
		 * One session line. Clicking it opens the session; the dropdown carries the
		 * per-session actions (group/ungroup, rename, archive). `showProject` is off
		 * inside a project group, where the tag would repeat the group name.
		 */
		function SidebarSessionRow({ sessionId, fallback, t, showProject }) {
			const snapshot = useSectionState();
			const info = describeSession(sessionId, fallback);
			const assignment = snapshot.assignments[sessionId];
			const status = sessionRowStatus(snapshot, sessionId);
			const tag = projectLabel(info.cwd);
			const withTag = showProject !== false && tag !== '';

			function openMenu(event) {
				const rect = event.currentTarget.getBoundingClientRect();
				const items =
					assignment === undefined
						? [
								{
									key: 'assign',
									label: t('sidebar.assign'),
									run: () => setPendingTarget({ sessionId, title: info.title, cwd: info.cwd }),
								},
							]
						: [
								{
									key: 'unassign',
									label: t('sidebar.unassign'),
									run: () => unassignSession(sessionId),
								},
							];
				items.push({
					key: 'rename',
					label: t('panel.rename'),
					run: () => setRenameTarget({ sessionId, title: info.title }),
				});
				items.push({
					key: 'archive',
					label: t('sidebar.archive'),
					danger: true,
					run: () => archiveSession(sessionId),
				});
				toggleDropdown('session:' + sessionId, { top: rect.top, bottom: rect.bottom, right: rect.right }, items);
			}

			return h(
				'div',
				{ className: ROW_CLASS, style: S.sessionRow },
				h(
					'button',
					{
						type: 'button',
						className: HOVER_CLASS,
						style: S.sessionOpen,
						title: info.title === '' ? sessionId : info.title,
						onClick: () => showSession(sessionId),
					},
					h('span', { style: S.sessionTitle }, info.title === '' ? t('panel.untitled') : info.title),
					info.missing ? h('span', { style: S.sessionWarn }, t('panel.missing')) : null,
					withTag ? h('span', { style: S.sessionTag }, tag) : null,
				),
				h(
					'div',
					{ style: S.rowTrail },
					status === ''
						? null
						: h(
								'span',
								{
									className: 'dsh-section-status',
									style: S.rowStatus,
									'data-status': status,
									role: 'img',
									'aria-label': status === 'running' ? t('sidebar.running') : t('sidebar.unread'),
									title: status === 'running' ? t('sidebar.running') : t('sidebar.unread'),
								},
								status === 'running'
									? h(SpinnerIcon, null)
									: h('span', { style: S.unreadDot }),
							),
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS + ' ' + REVEAL_CLASS,
							style: S.rowMore,
							title: t('sidebar.sessionMenu'),
							'aria-label': t('sidebar.sessionMenu'),
							'aria-haspopup': 'menu',
							'data-session': sessionId,
							onClick: openMenu,
						},
						h(MoreIcon, null),
					),
				),
			);
		}

		/** One section: collapsible, renameable, and a target for its own picker. */
		/**
		 * Page one group's rows: the first GROUP_PAGE render, every Show more click
		 * reveals the next page until the whole group is visible.
		 */
		function ShowMoreRow({ page, t }) {
			return page.more
				? h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.moreRow,
							onClick: () => revealGroup(page.key, page.total),
						},
						t('sidebar.showMore'),
					)
				: null;
		}

		function SidebarSectionGroup({ section, members, snapshot, t }) {
			const [picking, setPicking] = React.useState(false);
			const [renaming, setRenaming] = React.useState(false);
			const [draft, setDraft] = React.useState(section.name);
			const page = groupPage(snapshot, section.id, members.length);
			const collapsed = snapshot.collapsed[section.id] === true;

			function commitRename() {
				setRenaming(false);
				renameSection(section.id, draft);
			}

			return h(
				'div',
				{ style: S.group },
				h(
					'div',
					{ className: ROW_CLASS, style: S.groupHeader },
					renaming
						? h('input', {
								autoFocus: true,
								style: { ...S.input, margin: '0 2px', padding: '2px 6px' },
								value: draft,
								onChange: (event) => setDraft(event.target.value),
								onKeyDown: (event) => {
									if (event.key === 'Enter') commitRename();
									if (event.key === 'Escape') {
										setDraft(section.name);
										setRenaming(false);
									}
								},
								onBlur: commitRename,
							})
						: h(
								'button',
								{
									type: 'button',
									className: HOVER_CLASS,
									style: S.groupToggle,
									title: collapsed ? t('sidebar.expand') : t('sidebar.collapse'),
									'aria-expanded': !collapsed,
									onClick: () => toggleCollapsed(section.id),
								},
								h('span', { style: S.chevron }, h(Chevron, { open: !collapsed })),
								h('span', { style: S.groupName }, section.name),
							),
					renaming
						? null
						: h(
								'button',
								{
									type: 'button',
									className: HOVER_CLASS + ' ' + REVEAL_CLASS,
									style: S.iconButton,
									title: t('sidebar.more'),
									'aria-label': t('sidebar.more'),
									'aria-haspopup': 'menu',
									'data-section': section.id,
									onClick: (event) => {
										const rect = event.currentTarget.getBoundingClientRect();
										toggleDropdown(
											'section:' + section.id,
											{ top: rect.top, bottom: rect.bottom, right: rect.right },
											[
												{
													key: 'add',
													label: t('sidebar.addSession'),
													run: () => setPicking(true),
												},
												{
													key: 'rename',
													label: t('panel.rename'),
													run: () => {
														setDraft(section.name);
														setRenaming(true);
													},
												},
												{
													key: 'delete',
													label: t('panel.delete'),
													confirmLabel: t('panel.confirmDelete'),
													danger: true,
													run: () => removeSection(section.id),
												},
											],
										);
									},
								},
								h(MoreIcon, null),
							),
				),
				collapsed
					? null
					: h(
							'div',
							{ style: S.groupBody },
							picking
								? h(SessionPicker, { snapshot, sectionId: section.id, t, onClose: () => setPicking(false) })
								: null,
							members.length === 0 && !picking
								? h('div', { style: S.sidebarHint }, t('panel.noMembers'))
								: members
										.slice(0, page.count)
										.map(({ sessionId, assignment }) =>
											h(SidebarSessionRow, { key: sessionId, sessionId, fallback: assignment, t }),
										),
							h(ShowMoreRow, { key: 'more', page, t }),
						),
			);
		}

		/**
		 * One project group in the project view: collapsible, with a new-session
		 * action and a dropdown for the project itself (add, archive, bulk group).
		 */
		function SidebarWorkspaceGroup({ groupKey, name, workspaceId, sessionIds, t }) {
			const snapshot = useSectionState();
			const page = groupPage(snapshot, groupKey, sessionIds.length);
			const collapsed = snapshot.collapsed[groupKey] === true;

			function openMenu(event) {
				const rect = event.currentTarget.getBoundingClientRect();
				toggleDropdown('project:' + groupKey, { top: rect.top, bottom: rect.bottom, right: rect.right }, [
					{
						key: 'add',
						label: t('sidebar.addSession'),
						run: () => startSessionIn(workspaceId),
					},
					{
						key: 'section',
						label: t('sidebar.toSection'),
						run: () =>
							setProjectTarget({
								name,
								sessions: sessionIds
									.slice(0, SESSION_ROW_LIMIT)
									.map((sessionId) => describeSession(sessionId, undefined)),
							}),
					},
					{
						key: 'archive',
						label: t('sidebar.archiveProject'),
						confirmLabel: t('sidebar.confirmArchiveProject'),
						danger: true,
						run: () => archiveProject(workspaceId),
					},
				]);
			}

			return h(
				'div',
				{ style: S.group },
				h(
					'div',
					{ className: ROW_CLASS, style: S.groupHeader },
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.groupToggle,
							title: collapsed ? t('sidebar.expand') : t('sidebar.collapse'),
							'aria-expanded': !collapsed,
							onClick: () => toggleCollapsed(groupKey),
						},
						h('span', { style: S.chevron }, h(Chevron, { open: !collapsed })),
						h('span', { style: S.groupName }, name),
					),
					workspaceId === null
						? null
						: h(
								'div',
								{ style: S.groupActions },
								h(
									'button',
									{
										type: 'button',
										className: HOVER_CLASS + ' ' + REVEAL_CLASS,
										style: S.iconButton,
										title: t('sidebar.newSession'),
										'aria-label': t('sidebar.newSession'),
										onClick: () => startSessionIn(workspaceId),
									},
									h(PlusIcon, null),
								),
								h(
									'button',
									{
										type: 'button',
										className: HOVER_CLASS + ' ' + REVEAL_CLASS,
										style: S.iconButton,
										title: t('sidebar.projectMenu'),
										'aria-label': t('sidebar.projectMenu'),
										'aria-haspopup': 'menu',
										'data-group': groupKey,
										onClick: openMenu,
									},
									h(MoreIcon, null),
								),
							),
				),
				collapsed
					? null
					: h(
							'div',
							{ style: S.groupBody },
							sessionIds.length === 0
								? h('div', { style: S.sidebarHint }, t('sidebar.empty'))
								: sessionIds
										.slice(0, page.count)
										.map((sessionId) =>
											h(SidebarSessionRow, { key: sessionId, sessionId, fallback: undefined, t, showProject: false }),
										),
							h(ShowMoreRow, { key: 'more', page, t }),
						),
			);
		}

		/**
		 * The left column in section mode: sections first, then the sessions that
		 * are not filed in one, grouped by their workspace. It shadows the shipped
		 * browser, so it also carries the way back to it.
		 */
		function SectionBrowser({ wide, expandSidebar, useWorkspaces, t }) {
			const snapshot = useSectionState();
			const list = useSessionsSnapshot();
			const workspaceState = useWorkspaceState(useWorkspaces);
			const [query, setQuery] = React.useState('');
			const [filterOpen, setFilterOpen] = React.useState(false);
			const [projectQuery, setProjectQuery] = React.useState('');
			const [projectFilterOpen, setProjectFilterOpen] = React.useState(false);

			if (wide === false) {
				return h(
					'div',
					{ style: S.rail },
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.railButton,
							title: t('sidebar.title'),
							'aria-label': t('sidebar.title'),
							onClick: () => {
								if (typeof expandSidebar === 'function') expandSidebar();
							},
						},
						h(SectionSidebarIcon, { size: 18 }),
					),
				);
			}

			const summaries = isRecord(list) && isRecord(list.byId) ? list.byId : {};
			const current = isRecord(list) ? list.current : undefined;
			const ids = isRecord(list) && Array.isArray(list.ids) ? list.ids : [];
			const archived =
				isRecord(workspaceState) && Array.isArray(workspaceState.archivedSessionIds)
					? new Set(workspaceState.archivedSessionIds)
					: null;
			const workspaces = isRecord(workspaceState) && Array.isArray(workspaceState.items) ? workspaceState.items : [];
			const needle = query.trim().toLowerCase();
			const projectNeedle = projectQuery.trim().toLowerCase();

			function updatedAtOf(sessionId) {
				const summary = summaries[sessionId];
				return summary !== undefined && typeof summary.updatedAt === 'number' ? summary.updatedAt : 0;
			}

			/** `ok` renders, `gone` renders as stale, `hidden` stays out of both views. */
			function reach(sessionId) {
				const summary = summaries[sessionId];
				if (summary === undefined) return 'gone';
				if (summary.origin === 'subagent') return 'hidden';
				if (archived !== null && archived.has(sessionId)) return 'hidden';
				if (summary.blank === true && sessionId !== current) return 'hidden';
				return 'ok';
			}

			function matches(sessionId) {
				if (needle === '') return true;
				return (summaryTitle(sessionId) + ' ' + summaryCwd(sessionId)).toLowerCase().includes(needle);
			}

			const unassigned = ids
				.filter((sessionId) => reach(sessionId) === 'ok' && snapshot.assignments[sessionId] === undefined && matches(sessionId))
				.sort((left, right) => updatedAtOf(right) - updatedAtOf(left));
			const free = new Set(unassigned);

			const accounted = new Set();
			for (const workspace of workspaces) {
				for (const sessionId of Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []) accounted.add(sessionId);
			}

			const sectionGroups = snapshot.sections
				.map((section) => ({
					section,
					members: membersOf(snapshot, section.id).filter(
						({ sessionId }) => reach(sessionId) !== 'hidden' && matches(sessionId),
					),
				}))
				.filter(
					({ section, members }) =>
						needle === '' || section.name.toLowerCase().includes(needle) || members.length > 0,
				);

			const workspaceGroups = workspaces
				.map((workspace) => {
					const path = textOf(workspace.path);
					return {
						path,
						workspaceId: textOf(workspace.workspaceId) === '' ? null : workspace.workspaceId,
						name: textOf(workspace.title) === '' ? projectLabel(path) : textOf(workspace.title),
						sessionIds: (Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []).filter(
							(sessionId) => free.has(sessionId),
						),
					};
				})
				.filter((group) => group.sessionIds.length > 0);

			/** The project view has its own filter: it narrows projects and their sessions. */
			const projectGroups = workspaceGroups
				.map((group) => {
					if (projectNeedle === '') return group;
					if (group.name.toLowerCase().includes(projectNeedle)) return group;
					const hits = group.sessionIds.filter((sessionId) =>
						summaryTitle(sessionId).toLowerCase().includes(projectNeedle),
					);
					return hits.length === 0 ? null : { ...group, sessionIds: hits };
				})
				.filter((group) => group !== null);

			const strays = unassigned.filter((sessionId) => !accounted.has(sessionId));
			const strayName = t('sidebar.ungrouped');
			const strayHits =
				projectNeedle === '' || strayName.toLowerCase().includes(projectNeedle)
					? strays
					: strays.filter((sessionId) => summaryTitle(sessionId).toLowerCase().includes(projectNeedle));
			const strayGroup = strayHits.length === 0 ? null : { name: strayName, sessionIds: strayHits };

			return h(
				'div',
				{ style: S.browser },
				h(
					'div',
					{ style: S.browserBar },
					h('span', { style: S.browserBarTitle }, t('sidebar.title')),
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.iconButton,
							title: t('sidebar.filter'),
							'aria-label': t('sidebar.filter'),
							onClick: () => setFilterOpen((open) => !open),
						},
						h(SearchIcon, null),
					),
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.iconButton,
							title: t('sidebar.newSection'),
							'aria-label': t('sidebar.newSection'),
							onClick: () =>
								createSection(t('panel.defaultName') + ' ' + String(snapshot.sections.length + 1)),
						},
						h(PlusIcon, null),
					),
				),
				filterOpen
					? h(
							'div',
							{ style: S.browserFilter },
							h('input', {
								autoFocus: true,
								style: { ...S.input, width: '100%' },
								placeholder: t('sidebar.filter'),
								value: query,
								onChange: (event) => setQuery(event.target.value),
								onKeyDown: (event) => {
									if (event.key === 'Escape') {
										setQuery('');
										setFilterOpen(false);
									}
								},
							}),
						)
					: null,
				sectionGroups.length === 0
					? h('div', { style: S.sidebarHint }, needle === '' ? t('panel.emptyHint') : t('panel.pickerEmpty'))
					: sectionGroups.map(({ section, members }) =>
							h(SidebarSectionGroup, { key: section.id, section, members, snapshot, t }),
						),
				h('div', { style: S.divider }),
				h(
					'div',
					{ style: S.areaBar },
					h('span', { style: S.browserBarTitle }, t('sidebar.projects')),
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.iconButton,
							title: t('sidebar.filterProjects'),
							'aria-label': t('sidebar.filterProjects'),
							onClick: () => setProjectFilterOpen((open) => !open),
						},
						h(SearchIcon, null),
					),
					h(
						'button',
						{
							type: 'button',
							className: HOVER_CLASS,
							style: S.iconButton,
							title: t('sidebar.newProject'),
							'aria-label': t('sidebar.newProject'),
							onClick: () => {
								void addProject();
							},
						},
						h(PlusIcon, null),
					),
				),
				projectFilterOpen
					? h(
							'div',
							{ style: S.browserFilter },
							h('input', {
								autoFocus: true,
								style: { ...S.input, width: '100%' },
								placeholder: t('sidebar.filterProjects'),
								value: projectQuery,
								onChange: (event) => setProjectQuery(event.target.value),
								onKeyDown: (event) => {
									if (event.key === 'Escape') {
										setProjectQuery('');
										setProjectFilterOpen(false);
									}
								},
							}),
						)
					: null,
				projectGroups.length === 0 && strayGroup === null
					? h('div', { style: S.sidebarHint }, t('sidebar.emptyProjects'))
					: projectGroups.map((group) =>
							h(SidebarWorkspaceGroup, {
								key: 'ws:' + group.path,
								groupKey: 'ws:' + group.path,
								name: group.name,
								workspaceId: group.workspaceId,
								sessionIds: group.sessionIds,
								t,
							}),
						),
				strayGroup === null
					? null
					: h(SidebarWorkspaceGroup, {
							key: 'ungrouped',
							groupKey: 'ungrouped',
							name: strayGroup.name,
							workspaceId: null,
							sessionIds: strayGroup.sessionIds,
							t,
						}),
			);
		}

		/** The panel-side switch that starts and stops the section-mode sidebar. */
		function SidebarModeSwitch({ t }) {
			const snapshot = useSectionState();
			const on = snapshot.sidebar === 'sections';
			return h(
				'div',
				{ style: S.switchRow },
				h(
					'button',
					{
						type: 'button',
						role: 'switch',
						'aria-checked': on,
						'aria-label': t('panel.sidebarMode'),
						title: t('panel.sidebarMode'),
						className: HOVER_CLASS,
						style: on ? S.switchOn : S.switch,
						onClick: () => setSidebarMode(on ? 'host' : 'sections'),
					},
					h('span', { style: on ? S.switchKnobOn : S.switchKnob }),
				),
				h(
					'div',
					{ style: S.switchText },
					h('span', { style: S.switchLabel }, t('panel.sidebarMode')),
					h('span', { style: S.switchHint }, t('panel.sidebarModeHint')),
				),
			);
		}

		/* --------------------------- sidebar entries --------------------------- */

		function SectionSidebarIcon({ size }) {
			const dimension = typeof size === 'number' && size > 0 ? size : 16;
			return h(
				'svg',
				{
					width: dimension,
					height: dimension,
					viewBox: '0 0 16 16',
					fill: 'none',
					stroke: 'currentColor',
					strokeWidth: 1.4,
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
				},
				h('path', { d: 'M8 1.9 14.2 5 8 8.1 1.8 5z' }),
				h('path', { d: 'M2.6 8.4 8 11.1l5.4-2.7' }),
				h('path', { d: 'M2.6 11.4 8 14.1l5.4-2.7' }),
			);
		}

		function SectionDot({ sessionId }) {
			const snapshot = useSectionState();
			const assignment = snapshot.assignments[sessionId];
			if (assignment === undefined) return null;
			const section = snapshot.sections.find((candidate) => candidate.id === assignment.sectionId);
			if (section === undefined) return null;
			return h(
				'span',
				{
					title: section.name,
					style: {
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: '100%',
						height: '100%',
					},
				},
				h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: sectionColor(section.id) } }),
			);
		}

		/**
		 * Close the shipped menu when the slot provides its menu-open hook; the
		 * hook is version-dependent, so an unknown value is simply ignored.
		 */
		function closeFromMenuHook(value) {
			if (value === undefined || value === null) return;
			const closer =
				typeof value === 'function' ? value : typeof value.close === 'function' ? value.close : undefined;
			if (closer === undefined) return;
			try {
				closer();
			} catch (error) {
				console.warn('[dsh-section] the session menu did not close itself', error);
			}
		}

		function MoveToSectionMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
			const menuState = typeof useMenuOpenState === 'function' ? useMenuOpenState() : undefined;
			const assignment = useSectionState().assignments[sessionId];
			const fallback = assignment === undefined ? undefined : assignment;
			return h(
				'button',
				{
					type: 'button',
					role: 'menuitem',
					className: HOVER_CLASS,
					style: S.menuItem,
					onClick: () => {
						closeFromMenuHook(menuState);
						const info = describeSession(sessionId, fallback);
						setPendingTarget({
							sessionId,
							title: info.title === '' ? textOf(displayTitle) : info.title,
							cwd: info.cwd,
						});
					},
				},
				h(
					'svg',
					{ width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': 'true' },
					h('path', { d: 'M8 2.2 14 5 8 7.8 2 5z' }),
					h('path', { d: 'M2 8.6 8 11.4 14 8.6' }),
				),
				t('menu.moveToSection'),
			);
		}

		/* ------------------------------- dialog ------------------------------- */

		function MoveToSectionDialogBody({ t, target }) {
			const snapshot = useSectionState();
			const known = snapshot.assignments[target.sessionId];
			const [choice, setChoice] = React.useState(known === undefined ? '' : known.sectionId);
			const [creating, setCreating] = React.useState(snapshot.sections.length === 0);
			const [name, setName] = React.useState('');
			const rootRef = React.useRef(null);

			React.useEffect(() => {
				if (rootRef.current !== null) rootRef.current.focus();
			}, []);

			function confirm() {
				if (creating) {
					const trimmed = name.trim();
					const id = createSection(trimmed === '' ? t('panel.defaultName') + ' ' + String(snapshot.sections.length + 1) : trimmed);
					assignSession(target.sessionId, id, target);
					setPendingTarget(null);
					return;
				}
				if (choice === '') unassignSession(target.sessionId);
				else assignSession(target.sessionId, choice, target);
				setPendingTarget(null);
			}

			return h(
				'div',
				{
					style: S.backdrop,
					onMouseDown: (event) => {
						if (event.target === event.currentTarget) setPendingTarget(null);
					},
				},
				h(
					'div',
					{
						ref: rootRef,
						tabIndex: -1,
						role: 'dialog',
						'aria-modal': 'true',
						'aria-label': t('dialog.title'),
						style: S.dialog,
					},
					h('h2', { style: S.dialogTitle }, t('dialog.title')),
					h(
						'div',
						{ style: S.dialogTarget },
						h('div', { style: S.dialogLabel }, t('dialog.target')),
						h('div', { style: S.memberTitle }, target.title === '' ? target.sessionId : target.title),
						target.cwd === '' ? null : h('div', { style: S.memberMeta }, projectLabel(target.cwd)),
					),
					h('p', { style: S.dialogLabel }, t('dialog.pick')),
					snapshot.sections.length === 0
						? null
						: h(
								'div',
								{ style: S.stack },
								snapshot.sections.map((section) =>
									h(
										'button',
										{
											key: section.id,
											type: 'button',
											className: HOVER_CLASS,
											style: !creating && choice === section.id ? S.optionActive : S.option,
											'data-section': section.id,
											onClick: () => {
												setCreating(false);
												setChoice(section.id);
											},
										},
										h('span', { style: { ...S.dot, background: sectionColor(section.id) } }),
										h('span', { style: S.listRowName }, section.name),
									),
								),
								known === undefined
									? null
									: h(
											'button',
											{
												type: 'button',
												className: HOVER_CLASS,
												style: !creating && choice === '' ? S.optionActive : S.option,
												onClick: () => {
													setCreating(false);
													setChoice('');
												},
											},
											h('span', { style: { ...S.dot, background: 'transparent' } }),
											h('span', { style: S.listRowName }, t('dialog.none')),
										),
							),
					h(
						'div',
						{ style: S.stack },
						h(
							'button',
							{
								type: 'button',
								className: HOVER_CLASS,
								style: creating ? S.optionActive : S.option,
								onClick: () => setCreating(true),
							},
							h('span', { style: { ...S.dot, background: 'var(--dsw-alias-brand-primary)' } }),
							h('span', { style: S.listRowName }, t('dialog.newSection')),
						),
						creating
							? h('input', {
									autoFocus: true,
									style: { ...S.input, marginTop: 4 },
									placeholder: t('dialog.newPlaceholder'),
									value: name,
									onChange: (event) => setName(event.target.value),
									onKeyDown: (event) => {
										if (event.key === 'Enter') confirm();
									},
								})
							: null,
					),
					h(
						'div',
						{ style: S.dialogFooter },
						h('button', { type: 'button', className: HOVER_CLASS, style: S.button, onClick: () => setPendingTarget(null) }, t('dialog.cancel')),
						h('button', { type: 'button', className: HOVER_CLASS, style: S.buttonPrimary, onClick: confirm }, t('dialog.confirm')),
					),
				),
			);
		}

		/** Rename one session: the title lives in the Host, so this borrows the session. */
		function RenameSessionDialogBody({ t, target }) {
			const [name, setName] = React.useState(target.title);
			const rootRef = React.useRef(null);

			React.useEffect(() => {
				if (rootRef.current !== null) rootRef.current.focus();
			}, []);

			function confirm() {
				renameSession(target.sessionId, name);
				setRenameTarget(null);
			}

			return h(
				'div',
				{
					style: S.backdrop,
					onMouseDown: (event) => {
						if (event.target === event.currentTarget) setRenameTarget(null);
					},
				},
				h(
					'div',
					{
						ref: rootRef,
						tabIndex: -1,
						role: 'dialog',
						'aria-modal': 'true',
						'aria-label': t('dialog.renameTitle'),
						style: S.dialog,
					},
					h('h2', { style: S.dialogTitle }, t('dialog.renameTitle')),
					h(
						'div',
						{ style: S.dialogTarget },
						h('div', { style: S.dialogLabel }, t('dialog.target')),
						h('div', { style: S.memberTitle }, target.title === '' ? target.sessionId : target.title),
					),
					h('input', {
						autoFocus: true,
						style: { ...S.input, marginTop: 8 },
						value: name,
						onChange: (event) => setName(event.target.value),
						onKeyDown: (event) => {
							if (event.key === 'Enter') confirm();
						},
					}),
					h(
						'div',
						{ style: S.dialogFooter },
						h(
							'button',
							{ type: 'button', className: HOVER_CLASS, style: S.button, onClick: () => setRenameTarget(null) },
							t('dialog.cancel'),
						),
						h('button', { type: 'button', className: HOVER_CLASS, style: S.buttonPrimary, onClick: confirm }, t('dialog.confirm')),
					),
				),
			);
		}

		/** File every session of one project into a single section, at once. */
		function MoveProjectDialogBody({ t, target }) {
			const snapshot = useSectionState();
			const [creating, setCreating] = React.useState(snapshot.sections.length === 0);
			const [name, setName] = React.useState('');
			const rootRef = React.useRef(null);

			React.useEffect(() => {
				if (rootRef.current !== null) rootRef.current.focus();
			}, []);

			function moveInto(sectionId) {
				for (const session of target.sessions) {
					assignSession(session.sessionId, sectionId, session);
				}
				setProjectTarget(null);
			}

			function confirmCreate() {
				const trimmed = name.trim();
				moveInto(
					createSection(
						trimmed === '' ? t('panel.defaultName') + ' ' + String(snapshot.sections.length + 1) : trimmed,
					),
				);
			}

			return h(
				'div',
				{
					style: S.backdrop,
					onMouseDown: (event) => {
						if (event.target === event.currentTarget) setProjectTarget(null);
					},
				},
				h(
					'div',
					{
						ref: rootRef,
						tabIndex: -1,
						role: 'dialog',
						'aria-modal': 'true',
						'aria-label': t('dialog.projectTitle'),
						style: S.dialog,
					},
					h('h2', { style: S.dialogTitle }, t('dialog.projectTitle')),
					h(
						'div',
						{ style: S.dialogTarget },
						h('div', { style: S.dialogLabel }, t('dialog.projectTarget')),
						h('div', { style: S.memberTitle }, target.name),
						h('div', { style: S.memberMeta }, String(target.sessions.length) + ' ' + t('panel.unitSessions')),
					),
					h('p', { style: S.dialogLabel }, t('dialog.projectPick')),
					snapshot.sections.length === 0
						? null
						: h(
								'div',
								{ style: S.stack },
								snapshot.sections.map((section) =>
									h(
										'button',
										{
											key: section.id,
											type: 'button',
											className: HOVER_CLASS,
											style: S.option,
											'data-section': section.id,
											onClick: () => moveInto(section.id),
										},
										h('span', { style: { ...S.dot, background: sectionColor(section.id) } }),
										h('span', { style: S.listRowName }, section.name),
									),
								),
							),
					h(
						'div',
						{ style: S.stack },
						h(
							'button',
							{
								type: 'button',
								className: HOVER_CLASS,
								style: creating ? S.optionActive : S.option,
								onClick: () => setCreating(true),
							},
							h('span', { style: { ...S.dot, background: 'var(--dsw-alias-brand-primary)' } }),
							h('span', { style: S.listRowName }, t('dialog.newSection')),
						),
						creating
							? h('input', {
									autoFocus: true,
									style: { ...S.input, marginTop: 4 },
									placeholder: t('dialog.newPlaceholder'),
									value: name,
									onChange: (event) => setName(event.target.value),
									onKeyDown: (event) => {
										if (event.key === 'Enter') confirmCreate();
									},
								})
							: null,
					),
					h(
						'div',
						{ style: S.dialogFooter },
						creating
							? h(
									'button',
									{ type: 'button', className: HOVER_CLASS, style: S.buttonPrimary, onClick: confirmCreate },
									t('dialog.confirm'),
								)
							: null,
						h(
							'button',
							{ type: 'button', className: HOVER_CLASS, style: S.button, onClick: () => setProjectTarget(null) },
							t('dialog.cancel'),
						),
					),
				),
			);
		}

		/**
		 * The section dropdown. It renders from the frame-wide overlay layer, so it
		 * floats above the sidebar (and its scroll container) instead of expanding a
		 * row inside it. Items come from the trigger: `{ key, label, run, danger?,
		 * confirmLabel? }`; an item with `confirmLabel` arms on the first click.
		 */
		function SectionMenu({ menu, t }) {
			const [armed, setArmed] = React.useState(null);

			React.useEffect(() => {
				function onKeyDown(event) {
					if (event.key === 'Escape') closeDropdown();
				}
				window.addEventListener('keydown', onKeyDown, true);
				return () => window.removeEventListener('keydown', onKeyDown, true);
			}, []);

			const viewportWidth = typeof window.innerWidth === 'number' ? window.innerWidth : 1024;
			const viewportHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 768;
			const height = menu.items.length * SECTION_MENU_ROW + 8;
			const left = Math.max(
				8,
				Math.min(menu.anchor.right - SECTION_MENU_WIDTH, viewportWidth - SECTION_MENU_WIDTH - 8),
			);
			// Flip above the trigger when the dropdown would run past the viewport.
			const top =
				menu.anchor.bottom + height + 8 > viewportHeight
					? Math.max(8, menu.anchor.top - height - 6)
					: menu.anchor.bottom + 6;

			return h(
				React.Fragment,
				null,
				h('div', { style: S.menuBackdrop, onMouseDown: () => closeDropdown() }),
				h(
					'div',
					{ role: 'menu', 'aria-label': t('sidebar.more'), style: { ...S.menuPanel, left, top } },
					menu.items.map((item) =>
						h(
							'button',
							{
								key: item.key,
								type: 'button',
								role: 'menuitem',
								className: HOVER_CLASS,
								style: item.danger === true ? S.menuItemDanger : S.menuItem,
								onClick: () => {
									if (item.confirmLabel !== undefined && armed !== item.key) {
										setArmed(item.key);
										return;
									}
									closeDropdown();
									item.run();
								},
							},
							item.confirmLabel !== undefined && armed === item.key ? item.confirmLabel : item.label,
						),
					),
				),
			);
		}

		/** Owner of the `shell.overlay` seat: the dropdown and every dsh-section dialog. */
		function SectionOverlay({ t }) {
			const target = React.useSyncExternalStore(subscribePending, readPending);
			const menu = React.useSyncExternalStore(subscribeDropdown, readDropdown);
			const rename = React.useSyncExternalStore(subscribeRename, readRename);
			const project = React.useSyncExternalStore(subscribeProject, readProject);
			const open = target !== null || rename !== null || project !== null;

			React.useEffect(() => {
				if (!open) return undefined;
				function onKeyDown(event) {
					if (event.key !== 'Escape') return;
					if (rename !== null) setRenameTarget(null);
					if (project !== null) setProjectTarget(null);
					if (target !== null) setPendingTarget(null);
				}
				window.addEventListener('keydown', onKeyDown, true);
				return () => window.removeEventListener('keydown', onKeyDown, true);
			}, [open]);

			return h(
				React.Fragment,
				null,
				menu === null ? null : h(SectionMenu, { key: menu.token, menu, t }),
				rename === null ? null : h(RenameSessionDialogBody, { key: 'rename:' + rename.sessionId, t, target: rename }),
				project === null ? null : h(MoveProjectDialogBody, { key: 'project:' + project.name, t, target: project }),
				target === null ? null : h(MoveToSectionDialogBody, { key: target.sessionId, t, target }),
			);
		}

		/* -------------------------------- apply -------------------------------- */

		return {
			inject: ['slots', 'locale', 'sessions', 'workspaces', 'uiWorkspace'],
			apply(ctx) {
				services.sessions = ctx.sessions;
				services.workspaces = ctx.workspaces;
				services.uiWorkspace = ctx.uiWorkspace;

				ctx.effect(() => {
					const source = services.sessions === null ? undefined : services.sessions.list;
					if (source === undefined || typeof source.subscribe !== 'function') return () => {};
					const sync = () => syncSeen(source.getSnapshot());
					const stop = source.subscribe(sync);
					sync();
					return stop;
				}, 'dsh-section read baselines');

				ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'dsh-section dictionaries');
				ctx.effect(() => {
					const style = document.createElement('style');
					style.textContent = GLOBAL_CSS;
					document.body.appendChild(style);
					return () => style.remove();
				}, 'dsh-section control styles');

				ctx.slots.inject('main', () =>
					ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, SectionsPanel),
				);
				ctx.slots.inject('sidebar.panellist', () =>
					ctx.slots.register(
						{
							name: 'sidebar.panellist',
							id: PANEL_ID,
							order: 20,
							label: () => ctx.locale.bind(NS)('panel.title'),
							locale: NS,
						},
						SectionSidebarIcon,
					),
				);
				ctx.slots.inject('sidebar.session.row.leading', () =>
					ctx.slots.register({ name: 'sidebar.session.row.leading', id: 'dsh-section-dot', order: 5 }, SectionDot),
				);
				ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
					ctx.slots.register(
						{ name: 'sidebar.workspaces.session.menu.item', id: 'dsh-section-move', order: 250, locale: NS },
						MoveToSectionMenuItem,
					),
				);
				ctx.slots.inject('shell.overlay', () =>
					ctx.slots.register({ name: 'shell.overlay', id: 'dsh-section-dialog', order: 60, locale: NS }, SectionOverlay),
				);
				// Section mode: while it is on, our column shadows the shipped browser
				// at a lower priority; switching it off disposes the entry and restores
				// the host view untouched.
				ctx.slots.inject('sidebar.workspaces', () => {
					let dispose = null;
					let blocked = false;

					function sync() {
						if (readState().sidebar !== 'sections') {
							blocked = false;
							closeDropdown();
							if (dispose !== null) {
								const release = dispose;
								dispose = null;
								release();
							}
							return;
						}
						if (dispose !== null || blocked) return;
						try {
							dispose = ctx.slots.register(
								{ name: 'sidebar.workspaces', priority: -1, locale: NS },
								SectionBrowser,
							);
						} catch (error) {
							blocked = true;
							console.warn('[dsh-section] failed to mount the section sidebar', error);
						}
					}

					const stop = subscribeState(sync);
					sync();
					return () => {
						stop();
						closeDropdown();
						if (dispose !== null) {
							const release = dispose;
							dispose = null;
							release();
						}
					};
				});
			},
		};
	},
});
