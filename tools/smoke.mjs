/**
 * Static smoke harness for client.js.
 *
 * The plugin only runs inside the browser module table, so this harness supplies
 * a tiny React + DOM stub, loads the real bundle, applies it against a fake ctx,
 * and shallow-renders every registered entry. It catches load-time crashes,
 * missing registrations, locale gaps, and toggle wiring regressions.
 *
 * It is a development tool: it is intentionally not listed in package.json
 * "files" and therefore never ships.
 *
 *   node tools/smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8');

let failures = 0;
function check(label, condition, detail) {
	if (condition) {
		console.log('  ok   ' + label);
		return;
	}
	failures += 1;
	console.log('  FAIL ' + label + (detail === undefined ? '' : ' → ' + JSON.stringify(detail)));
}

/* ------------------------------- browser stubs ------------------------------- */

const stored = new Map();
const localStorage = {
	getItem: (key) => (stored.has(key) ? stored.get(key) : null),
	setItem: (key, value) => stored.set(key, String(value)),
	removeItem: (key) => stored.delete(key),
};

// A returning operator: one grouped session, one stale member, a collapsed
// workspace, and the host view still selected.
stored.set(
	'dsh-section.state.v1',
	JSON.stringify({
		sections: [
			{ id: 'sec-1', name: 'loyalty2.2', color: 0 },
			{ id: 'sec-2', name: 'ePin', color: 1 },
		],
		assignments: {
			's-bonus': { sectionId: 'sec-1', title: 'Bonus 回源优化', cwd: '/Users/dev/mshop', at: 2 },
			's-slain': { sectionId: 'sec-2', title: '失效会话', cwd: '/Users/dev/old', at: 3 },
		},
		sidebar: 'host',
		collapsed: { 'sec-2': true },
		seen: { 's-bonus': 1 },
	}),
);

const styles = [];
const document = {
	createElement: () => ({
		textContent: '',
		removed: false,
		remove() {
			this.removed = true;
		},
	}),
	body: { appendChild: (node) => styles.push(node) },
	addEventListener() {},
	removeEventListener() {},
};

const loaded = [];
const window = {
	localStorage,
	innerWidth: 1024,
	innerHeight: 768,
	addEventListener() {},
	removeEventListener() {},
	__ModuleLoader__: { load: (module) => loaded.push(module) },
};

/* --------------------------------- React stub -------------------------------- */

let hosts = [];
let texts = [];
let treeKey = 'root';
let hookCursor = 0;
const hookStore = new Map();

/**
 * Point the stub hooks at one mounted tree. Hook values persist per tree key, so
 * a test can render, click a control, render again and observe the component's
 * own state change the way a real mounted component would.
 */
function useTree(key) {
	treeKey = key;
	if (!hookStore.has(key)) hookStore.set(key, []);
	return key;
}

const React = {
	Fragment: Symbol('react.fragment'),
	createElement(type, props, ...children) {
		return { type, props: props === null || props === undefined ? {} : props, children: children.flat(Infinity) };
	},
	useState(initial) {
		const values = hookStore.get(treeKey);
		const index = hookCursor;
		hookCursor += 1;
		if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
		return [
			values[index],
			(next) => {
				values[index] = typeof next === 'function' ? next(values[index]) : next;
			},
		];
	},
	useEffect() {},
	useMemo(produce) {
		return produce();
	},
	useRef(value) {
		return { current: value };
	},
	useSyncExternalStore(subscribe, getSnapshot) {
		subscribe(() => {});
		return getSnapshot();
	},
};

function render(node) {
	if (node === null || node === undefined || typeof node === 'boolean') return;
	if (Array.isArray(node)) {
		for (const child of node) render(child);
		return;
	}
	if (typeof node === 'string' || typeof node === 'number') {
		texts.push(String(node));
		return;
	}
	if (typeof node.type === 'function') {
		render(node.type({ ...node.props, children: node.children }));
		return;
	}
	if (node.type === React.Fragment) {
		for (const child of node.children) render(child);
		return;
	}
	hosts.push({ type: node.type, props: withClickEvent(node.props), children: node.children });
	for (const child of node.children) render(child);
}

/** Where a dropdown trigger pretends to sit, so positioning code has a rect. */
const ANCHOR_RECT = { top: 100, bottom: 120, left: 220, right: 240 };

/**
 * A DOM click always carries an event; hand one to handlers that read the
 * trigger's geometry so click paths behave like the browser.
 */
function withClickEvent(props) {
	if (typeof props.onClick !== 'function') return props;
	const original = props.onClick;
	return {
		...props,
		onClick: (event) =>
			original(event === undefined ? { currentTarget: { getBoundingClientRect: () => ANCHOR_RECT } } : event),
	};
}

/** The visible label of a host element (its string children joined). */
function labelOf(node) {
	return (node.children || []).filter((child) => typeof child === 'string' || typeof child === 'number').join('');
}

function renderEntry(component, props) {
	useTree(treeKey);
	hosts = [];
	texts = [];
	hookCursor = 0;
	render(React.createElement(component, props));
	return { hosts, texts };
}

/* ------------------------------- fake host world ------------------------------ */

const SESSIONS = [
	{ id: 's-bonus', displayTitle: 'Bonus 回源优化', cwd: '/Users/dev/mshop', updatedAt: 30, blank: false },
	{ id: 's-epin', displayTitle: 'ePin SETA 限制', cwd: '/Users/dev/apollo_data', updatedAt: 20, blank: false, running: true },
	{ id: 's-blank', displayTitle: '', cwd: '/Users/dev/mshop', updatedAt: 10, blank: true },
	{ id: 's-sub', displayTitle: 'subagent', cwd: '/Users/dev/mshop', updatedAt: 40, origin: 'subagent', blank: false },
];
const sessionList = {
	getSnapshot: () => ({
		ids: SESSIONS.map((session) => session.id),
		byId: Object.fromEntries(SESSIONS.map((session) => [session.id, session])),
		current: undefined,
		phase: 'ready',
	}),
	subscribe: () => () => {},
};

const opened = [];
const started = [];
const archived = [];
const deletedProjects = [];
const createdProjects = [];
const openedWorkspaces = [];
const borrowed = [];
const renamed = [];
const fakeCtx = {
	sessions: {
		list: sessionList,
		retain(id, options) {
			borrowed.push({ id, source: options?.source });
			return {
				ready: Promise.resolve({
					session: {
						rename: (title) => {
							renamed.push({ id, title });
							return Promise.resolve({ title });
						},
					},
				}),
				release: () => {},
			};
		},
	},
	workspaces: {
		delete: (workspaceId) => {
			deletedProjects.push(workspaceId);
			return Promise.resolve();
		},
		create: (input) => {
			createdProjects.push(input);
			return Promise.resolve({ workspaceId: 'w-new', path: input.path, title: 'new_project', sessionIds: [] });
		},
	},
	uiWorkspace: {
		openSession: (id) => opened.push(id),
		startSession: (id) => started.push(id),
		archiveSession: (id) => {
			archived.push(id);
			return Promise.resolve();
		},
		pickDirectory: () => Promise.resolve('/Users/dev/new_project'),
		openWorkspace: (id) => {
			openedWorkspaces.push(id);
			return Promise.resolve();
		},
	},
	locale: {
		registered: [],
		register(namespace, dictionaries) {
			this.registered.push({ namespace, dictionaries });
			return () => {};
		},
		bind: () => (key) => key,
	},
	effects: [],
	cleanups: [],
	effect(produce, description) {
		this.effects.push(description);
		this.cleanups.push(produce());
		return () => {};
	},
	slots: {
		injected: [],
		registered: [],
		disposed: [],
		inject(name, produce) {
			this.injected.push(name);
			const cleanup = produce();
			if (typeof cleanup === 'function') this.injectedCleanups = { ...(this.injectedCleanups ?? {}), [name]: cleanup };
		},
		register(options, component) {
			const record = { options, component, active: true };
			this.registered.push(record);
			return () => {
				record.active = false;
				this.disposed.push(options);
			};
		},
	},
};

const workspaces = {
	items: [
		{ workspaceId: 'w-mshop', path: '/Users/dev/mshop', title: 'mshop', sessionIds: ['s-bonus', 's-blank'] },
		{ workspaceId: 'w-apollo', path: '/Users/dev/apollo_data', title: 'apollo_data', sessionIds: ['s-epin'] },
	],
	archivedSessionIds: [],
	phase: 'ready',
};

const browserProps = (wide) => ({
	wide,
	expandSidebar: () => {},
	useWorkspaces: (selector) => selector(workspaces),
	t: (key) => key,
});

const registered = (name) => fakeCtx.slots.registered.filter((record) => record.options.name === name);
const lastRegistered = (name) => registered(name).filter((record) => record.active).pop();
const overlayRecord = () => lastRegistered('shell.overlay');
const state = () => JSON.parse(stored.get('dsh-section.state.v1') ?? '{}');
const mode = () => state().sidebar;
const menuItem = (rendered, label) =>
	rendered.hosts.find((node) => node.props.role === 'menuitem' && labelOf(node) === label);
const sessionTrigger = (rendered, sessionId) =>
	rendered.hosts.find((node) => node.props['data-session'] === sessionId);
const projectTrigger = (rendered, groupKey) =>
	rendered.hosts.find((node) => node.props['data-group'] === groupKey);
const sectionOption = (rendered, sectionId) =>
	rendered.hosts.find((node) => node.props['data-section'] === sectionId);
const openOverlay = (tree) => {
	useTree(tree);
	return renderEntry(overlayRecord().component, { t: (key) => key });
};

/* ----------------------------------- run it ---------------------------------- */

const load = new Function('window', 'document', 'localStorage', 'console', source);
load(window, document, localStorage, console);

console.log('# load');
check(
	'module registered through __ModuleLoader__',
	loaded.length === 1 && loaded[0].id === '@local/dsh-section',
	loaded.map((module) => module.id),
);
const api = loaded[0].factory((id) => {
	if (id === 'react') return React;
	throw new Error('unexpected require: ' + id);
});
check('factory returns inject + apply', Array.isArray(api.inject) && typeof api.apply === 'function');

console.log('# apply (host mode)');
api.apply(fakeCtx);
const names = fakeCtx.slots.registered.map((record) => record.options.name);
check('five entries registered in host mode', names.length === 5, names);
check('main key', fakeCtx.slots.registered[0].options.key === 'dsh-section');
check('panellist id', fakeCtx.slots.registered[1].options.id === 'dsh-section');
check('row leading id', fakeCtx.slots.registered[2].options.id === 'dsh-section-dot');
check('session menu id', fakeCtx.slots.registered[3].options.id === 'dsh-section-move');
check('overlay id', fakeCtx.slots.registered[4].options.id === 'dsh-section-dialog');
check(
	'sidebar.workspaces is watched but not occupied',
	fakeCtx.slots.injected.includes('sidebar.workspaces') && !names.includes('sidebar.workspaces'),
	fakeCtx.slots.injected,
);
check('global styles appended to document.body', styles.length === 1 && styles[0].textContent.includes('.dsh-section-reveal'));
const dictionaries = fakeCtx.locale.registered[0];
check('locale namespace registered', dictionaries.namespace === 'dsh-section');
const en = dictionaries.dictionaries.en;
const zh = dictionaries.dictionaries.zh;
const sorted = (dict) => Object.keys(dict).sort().join('|');
check(
	'en/zh dictionaries agree key for key',
	Object.keys(en).length > 0 && sorted(en) === sorted(zh),
	{ en: Object.keys(en).length, zh: Object.keys(zh).length },
);
check('dictionary feeds the panel', en['panel.title'] === 'Sections');

const panelEntry = fakeCtx.slots.registered.find((record) => record.options.name === 'main');

console.log('# panel mode switch');
useTree('panel');
const panel = renderEntry(panelEntry.component, { t: (key) => key });
const toggle = panel.hosts.find((node) => node.props.role === 'switch');
check('panel renders the mode switch', toggle !== undefined && toggle.props['aria-checked'] === false);
check('panel still lists the sections', panel.texts.includes('loyalty2.2'));

console.log('# enabling section mode');
toggle.props.onClick();
const browserEntry = lastRegistered('sidebar.workspaces');
check(
	'sidebar.workspaces entry registered on toggle',
	browserEntry !== undefined && browserEntry.options.priority === -1,
	browserEntry === undefined ? null : browserEntry.options,
);
check('mode persisted', mode() === 'sections', mode());

console.log('# section browser (wide)');
useTree('browser');
const browser = renderEntry(browserEntry.component, browserProps(true));
check(
	'section groups render',
	browser.texts.includes('loyalty2.2') && browser.texts.includes('ePin') && browser.texts.includes('Bonus 回源优化'),
	browser.texts.slice(0, 14),
);
check('collapsed section hides its members', !browser.texts.includes('失效会话'));
check('ungrouped session shows under its workspace', browser.texts.includes('apollo_data') && browser.texts.includes('ePin SETA 限制'));
check('subagent and blank sessions stay hidden', !browser.texts.includes('subagent'));
check('project view entry point present', browser.hosts.some((node) => node.props.title === 'sidebar.hostView'));

console.log('# expanding a collapsed section');
browser.hosts.find((node) => node.props.title === 'sidebar.expand').props.onClick();
const expandedBrowser = renderEntry(browserEntry.component, browserProps(true));
check('expanding reveals the member again', expandedBrowser.texts.includes('失效会话'));
check('stale member still listed as stale', expandedBrowser.texts.includes('panel.missing'));

console.log('# session row status');
const statusCells = (rendered) => rendered.hosts.filter((node) => node.props['data-status'] !== undefined);
const statusOf = (rendered, value) => statusCells(rendered).find((node) => node.props['data-status'] === value);
const unreadCell = statusOf(expandedBrowser, 'unread');
check(
	'an unwatched completion marks its row in the menu cell',
	unreadCell !== undefined && unreadCell.props.className === 'dsh-section-status',
	statusCells(expandedBrowser).map((node) => node.props['data-status']),
);
check(
	'the unread marker is a small brand dot',
	unreadCell !== undefined &&
		unreadCell.children.some(
			(child) => child && child.props && typeof child.props.style === 'object' && child.props.style.borderRadius === '50%',
		),
);
check(
	'the row keeps its dropdown trigger beside the status',
	sessionTrigger(expandedBrowser, 's-bonus') !== undefined,
);
const runningCell = statusOf(expandedBrowser, 'running');
check(
	'live work shows a spinner in the same cell',
	runningCell !== undefined &&
		runningCell.children.some((child) => child && child.props && child.props.className === 'dsh-section-spinner'),
);
const rowOpen = expandedBrowser.hosts.find(
	(node) => node.type === 'button' && node.props.title === 'Bonus 回源优化',
);
check('a row still opens its session', rowOpen !== undefined);
rowOpen.props.onClick();
useTree('browser');
const afterRead = renderEntry(browserEntry.component, browserProps(true));
check(
	'opening a session clears its unread marker',
	statusOf(afterRead, 'unread') === undefined && statusOf(afterRead, 'running') !== undefined,
	statusCells(afterRead).map((node) => node.props['data-status']),
);

console.log('# session row dropdown');
const rowMenuTrigger = sessionTrigger(expandedBrowser, 's-bonus');
check('a grouped row offers its own dropdown trigger', rowMenuTrigger !== undefined);
rowMenuTrigger.props.onClick();
const rowMenu = openOverlay('overlay:row');
check(
	'session dropdown offers ungroup, rename and archive',
	['sidebar.unassign', 'panel.rename', 'sidebar.archive'].every((label) => rowMenu.texts.includes(label)),
	rowMenu.texts,
);
menuItem(rowMenu, 'sidebar.unassign').props.onClick();
useTree('browser');
const afterUnassign = renderEntry(browserEntry.component, browserProps(true));
check(
	'unassigning moves the session to its workspace group',
	afterUnassign.texts.filter((text) => text === 'Bonus 回源优化').length === 1 &&
		afterUnassign.texts.includes('mshop'),
);
check(
	'project rows do not repeat their project name',
	afterUnassign.texts.filter((text) => text === 'mshop').length === 1,
	afterUnassign.texts.filter((text) => text === 'mshop').length,
);

console.log('# ungrouped row dropdown');
const freeTrigger = sessionTrigger(afterUnassign, 's-bonus');
check('an ungrouped row offers its own dropdown trigger', freeTrigger !== undefined);
freeTrigger.props.onClick();
const freeMenu = openOverlay('overlay:row2');
check(
	'ungrouped row dropdown offers grouping instead',
	['sidebar.assign', 'panel.rename', 'sidebar.archive'].every((label) => freeMenu.texts.includes(label)),
	freeMenu.texts,
);
menuItem(freeMenu, 'sidebar.assign').props.onClick();
const assignDialog = openOverlay('dialog:assign');
check(
	'assigning opens the dialog with cancel and confirm',
	assignDialog.texts.includes('dialog.cancel') && assignDialog.texts.includes('dialog.confirm'),
	assignDialog.texts,
);
assignDialog.hosts.find((node) => node.type === 'button' && labelOf(node) === 'dialog.cancel').props.onClick();
const assignClosed = openOverlay('dialog:assign');
check('cancel closes the dialog', assignClosed.hosts.length === 0, assignClosed.hosts.length);

const openRow = afterUnassign.hosts.find((node) => node.props.title === 'Bonus 回源优化');
if (openRow !== undefined) openRow.props.onClick();
check('opening a row calls uiWorkspace.openSession', opened.includes('s-bonus'), opened);

console.log('# project groups');
const plusTriggers = afterUnassign.hosts.filter((node) => node.props.title === 'sidebar.newSession');
const projectTriggers = afterUnassign.hosts.filter((node) => node.props.title === 'sidebar.projectMenu');
check(
	'every project group offers new-session and a dropdown',
	plusTriggers.length === 2 && projectTriggers.length === 2,
	{ plus: plusTriggers.length, menus: projectTriggers.length },
);
check(
	'the project dropdown sits with its own plus button',
	projectTriggers.every((node, index) => {
		const plusAt = afterUnassign.hosts.indexOf(plusTriggers[index]);
		const menuAt = afterUnassign.hosts.indexOf(node);
		const nextPlusAt =
			index + 1 < plusTriggers.length ? afterUnassign.hosts.indexOf(plusTriggers[index + 1]) : afterUnassign.hosts.length;
		return menuAt > plusAt && menuAt < nextPlusAt;
	}),
);
const apolloTrigger = projectTrigger(afterUnassign, 'ws:/Users/dev/apollo_data');
check('a project dropdown targets its own group', apolloTrigger !== undefined);
apolloTrigger.props.onClick();
const projectMenu = openOverlay('overlay:project');
check(
	'project dropdown offers add, section and archive',
	['sidebar.addSession', 'sidebar.toSection', 'sidebar.archiveProject'].every((label) => projectMenu.texts.includes(label)),
	projectMenu.texts,
);
menuItem(projectMenu, 'sidebar.toSection').props.onClick();
const projectDialog = openOverlay('dialog:project');
check(
	'project dialog names the project and its size',
	projectDialog.texts.includes('apollo_data') && projectDialog.texts.includes('1 panel.unitSessions'),
	projectDialog.texts,
);
sectionOption(projectDialog, 'sec-1').props.onClick();
check(
	'the whole project moves into the chosen section',
	state().assignments['s-epin'] !== undefined && state().assignments['s-epin'].sectionId === 'sec-1',
	state().assignments,
);

console.log('# archive a project');
useTree('browser');
const afterMove = renderEntry(browserEntry.component, browserProps(true));
check('the moved project leaves the ungrouped tree', projectTrigger(afterMove, 'ws:/Users/dev/apollo_data') === undefined);
projectTrigger(afterMove, 'ws:/Users/dev/mshop').props.onClick();
const mshopMenu = openOverlay('overlay:project2');
menuItem(mshopMenu, 'sidebar.archiveProject').props.onClick();
const armedProject = openOverlay('overlay:project2');
check('archiving a project asks for confirmation first', menuItem(armedProject, 'sidebar.confirmArchiveProject') !== undefined);
menuItem(armedProject, 'sidebar.confirmArchiveProject').props.onClick();
check('archiving a project deletes the workspace', deletedProjects.includes('w-mshop'), deletedProjects);

console.log('# archive a session');
useTree('browser');
const beforeArchive = renderEntry(browserEntry.component, browserProps(true));
sessionTrigger(beforeArchive, 's-bonus').props.onClick();
const archiveMenu = openOverlay('overlay:archive');
menuItem(archiveMenu, 'sidebar.archive').props.onClick();
check('archiving a session calls the host', archived.includes('s-bonus'), archived);

console.log('# rename a session');
useTree('browser');
const beforeRename = renderEntry(browserEntry.component, browserProps(true));
sessionTrigger(beforeRename, 's-bonus').props.onClick();
const renameMenu = openOverlay('overlay:rename');
menuItem(renameMenu, 'panel.rename').props.onClick();
const renameDialog = openOverlay('dialog:rename');
const nameInput = renameDialog.hosts.find((node) => node.type === 'input');
check(
	'rename dialog preloads the current title',
	nameInput !== undefined && nameInput.props.value === 'Bonus 回源优化',
	nameInput === undefined ? null : nameInput.props.value,
);
nameInput.props.onChange({ target: { value: 'Bonus v2' } });
const renameDialog2 = openOverlay('dialog:rename');
renameDialog2.hosts.find((node) => node.type === 'button' && labelOf(node) === 'dialog.confirm').props.onClick();
await new Promise((resolve) => setTimeout(resolve, 0));
check(
	'renaming borrows the session and commits the new title',
	borrowed.length === 1 && borrowed[0].id === 's-bonus' && renamed.length === 1 && renamed[0].title === 'Bonus v2',
	{ borrowed: borrowed.length, renamed },
);
useTree('browser');

console.log('# project area bar');
const addProjectButton = afterUnassign.hosts.find((node) => node.props.title === 'sidebar.newProject');
const projectFilterButton = afterUnassign.hosts.find((node) => node.props.title === 'sidebar.filterProjects');
check(
	'project area has its own bar with a filter and an add button',
	afterUnassign.texts.includes('sidebar.projects') &&
		addProjectButton !== undefined &&
		projectFilterButton !== undefined,
	afterUnassign.texts.slice(0, 6),
);
projectFilterButton.props.onClick();
const filterOpen = renderEntry(browserEntry.component, browserProps(true));
const projectInput = filterOpen.hosts.find(
	(node) => node.type === 'input' && node.props.placeholder === 'sidebar.filterProjects',
);
check('project filter opens an input', projectInput !== undefined);
projectInput.props.onChange({ target: { value: 'apollo' } });
const filteredProjects = renderEntry(browserEntry.component, browserProps(true));
check(
	'project filter narrows the project area',
	filteredProjects.texts.includes('apollo_data') && !filteredProjects.texts.includes('mshop'),
	filteredProjects.texts.slice(-8),
);
addProjectButton.props.onClick();
await new Promise((resolve) => setTimeout(resolve, 0));
check(
	'add project picks a directory and registers it',
	createdProjects.length === 1 &&
		createdProjects[0].path === '/Users/dev/new_project' &&
		openedWorkspaces.includes('w-new'),
	{ createdProjects, openedWorkspaces },
);
projectInput.props.onChange({ target: { value: '' } });

console.log('# deleting a section keeps section mode');
const beforeDelete = renderEntry(browserEntry.component, browserProps(true));
const moreButtons = beforeDelete.hosts.filter((node) => node.props.title === 'sidebar.more');
check('every section group offers its dropdown trigger', moreButtons.length === 2, moreButtons.length);
check(
	'no inline tools row inside the group',
	!beforeDelete.texts.includes('sidebar.addSession') && !beforeDelete.texts.includes('panel.delete'),
	beforeDelete.texts.slice(0, 10),
);
moreButtons[0].props.onClick();
const menu = openOverlay('overlay:delete');
check('the dropdown opens in the overlay layer', menu.hosts.some((node) => node.props.role === 'menu'));
check(
	'dropdown offers add, rename and delete',
	['sidebar.addSession', 'panel.rename', 'panel.delete'].every((label) => menu.texts.includes(label)),
	menu.texts.slice(0, 8),
);
const menuPanelHost = menu.hosts.find((node) => node.props.role === 'menu');
check(
	'dropdown is a fixed panel anchored to its trigger',
	menuPanelHost.props.style.position === 'fixed' &&
		typeof menuPanelHost.props.style.top === 'number' &&
		typeof menuPanelHost.props.style.left === 'number',
	{ top: menuPanelHost.props.style.top, left: menuPanelHost.props.style.left },
);
const deleteItem = menuItem(menu, 'panel.delete');
check('dropdown renders its items as menuitems', deleteItem !== undefined);
deleteItem.props.onClick();
const armed = openOverlay('overlay:delete');
const confirmItem = menuItem(armed, 'panel.confirmDelete');
check('deleting asks for confirmation first', confirmItem !== undefined && menuItem(armed, 'panel.delete') === undefined);
confirmItem.props.onClick();
const menuClosed = openOverlay('overlay:delete');
check('choosing an item closes the dropdown', !menuClosed.hosts.some((node) => node.props.role === 'menu'));
useTree('browser');
const afterDelete = renderEntry(browserEntry.component, browserProps(true));
check('deleted section leaves the tree', !afterDelete.texts.includes('loyalty2.2'), afterDelete.texts.slice(0, 12));
check('section mode survives a delete', mode() === 'sections', mode());
check('remaining section keeps its member', afterDelete.texts.includes('ePin') && afterDelete.texts.includes('失效会话'), afterDelete.texts);
check('sidebar entry survives a delete', browserEntry.active === true);

console.log('# dropdown near the bottom edge');
window.innerHeight = 130;
moreButtons[0].props.onClick();
const flipped = openOverlay('overlay:flip');
const flippedHost = flipped.hosts.find((node) => node.props.role === 'menu');
check(
	'dropdown flips above a trigger with no room below',
	flippedHost.props.style.top < ANCHOR_RECT.top,
	flippedHost.props.style.top,
);
window.innerHeight = 768;

console.log('# the dropdown add action opens the picker');
useTree('browser:add');
const addFlow = renderEntry(browserEntry.component, browserProps(true));
addFlow.hosts.filter((node) => node.props.title === 'sidebar.more')[0].props.onClick();
const addMenu = openOverlay('overlay:add');
menuItem(addMenu, 'sidebar.addSession').props.onClick();
useTree('browser:add');
const picking = renderEntry(browserEntry.component, browserProps(true));
check(
	'add action opens the session picker inside that group',
	picking.hosts.some((node) => node.type === 'input' && node.props.placeholder === 'panel.pickerPlaceholder'),
	picking.texts.slice(0, 12),
);
useTree('browser');

console.log('# back to the host view');
browser.hosts.find((node) => node.props.title === 'sidebar.hostView').props.onClick();
check('sidebar entry disposed', browserEntry.active === false, fakeCtx.slots.disposed.map((options) => options.name));
check('mode back to host', mode() === 'host', mode());

console.log('# narrow rail');
useTree('rail');
const railToggle = panel.hosts.find((node) => node.props.role === 'switch');
railToggle.props.onClick();
const narrow = renderEntry(lastRegistered('sidebar.workspaces').component, browserProps(false));
check(
	'rail shows the restore button only',
	narrow.hosts.some((node) => node.type === 'button') && narrow.hosts.every((node) => node.type === 'div' || node.type === 'button' || node.type === 'svg' || node.type === 'path'),
	narrow.hosts.map((node) => node.type),
);
const railButton = narrow.hosts.find((node) => node.type === 'button');
let expanded = false;
const expandable = renderEntry(lastRegistered('sidebar.workspaces').component, {
	...browserProps(false),
	expandSidebar: () => {
		expanded = true;
	},
});
expandable.hosts.find((node) => node.type === 'button').props.onClick();
check('rail button asks the shell to expand', expanded === true);
void railButton;

console.log('# other entries');
useTree('menu');
const menuEntry = fakeCtx.slots.registered.find((record) => record.options.name === 'sidebar.workspaces.session.menu.item');
const sessionMenu = renderEntry(menuEntry.component, {
	sessionId: 's-epin',
	displayTitle: 'ePin SETA 限制',
	useMenuOpenState: () => ({ close: () => {} }),
	t: (key) => key,
});
check('session menu item renders as a menuitem', sessionMenu.hosts.some((node) => node.props.role === 'menuitem'), sessionMenu.hosts.map((node) => node.type));
sessionMenu.hosts.find((node) => node.props.role === 'menuitem').props.onClick();
useTree('dialog:s-epin');
const dialog = renderEntry(
	fakeCtx.slots.registered.find((record) => record.options.name === 'shell.overlay').component,
	{ t: (key) => key },
);
check('menu item opens the dialog for that session', dialog.texts.includes('ePin SETA 限制'), dialog.texts.slice(0, 8));

useTree('dot');
const dotEntry = fakeCtx.slots.registered.find((record) => record.options.name === 'sidebar.session.row.leading');
check('dot hidden for ungrouped sessions', renderEntry(dotEntry.component, { sessionId: 's-blank' }).hosts.length === 0);
check('dot shown for grouped sessions', renderEntry(dotEntry.component, { sessionId: 's-slain' }).hosts.length > 0);

useTree('icon');
const iconEntry = fakeCtx.slots.registered.find((record) => record.options.name === 'sidebar.panellist');
check(
	'sidebar icon renders the section glyph',
	renderEntry(iconEntry.component, { size: 16, active: false }).hosts.some((node) => node.type === 'svg'),
);

console.log('# cleanup');
for (const dispose of fakeCtx.cleanups) if (typeof dispose === 'function') dispose();
check('host styles removed on dispose', styles[0].removed === true);

console.log(failures === 0 ? '\nSMOKE PASS' : '\nSMOKE FAIL: ' + failures);
process.exit(failures === 0 ? 0 : 1);
