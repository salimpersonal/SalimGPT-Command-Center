"""End-to-end smoke checks. Requires Python Playwright and local HTTP server on :8721."""
import time
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

url=os.environ.get('SGCC_BASE_URL','http://127.0.0.1:8721/')
root=Path(__file__).resolve().parents[1]
preview_dir=Path(os.environ.get('SGCC_SCREENSHOTS',str(root/'screenshots')))
preview_dir.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,**({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}),args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1440,'height':920},device_scale_factor=1)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda x:errors.append(str(x)))
    page.goto(url,wait_until='networkidle',timeout=30000)
    page.screenshot(path=str(preview_dir/'sgcc-desktop-preview.png'),full_page=True)
    assert page.locator('h1').first.is_visible(), 'Dashboard should render'
    print('dashboard:', page.locator('h1').first.inner_text())
    # Idea save via Quick Capture
    page.locator('input[name="title"]').first.fill('Test: Evidence-based history of oceans')
    page.get_by_role('button',name='Save Idea').click()
    page.wait_for_timeout(350)
    page.locator('[data-nav="ideas"]').first.click()
    assert page.get_by_text('Test: Evidence-based history of oceans').first.is_visible()
    # Convert idea into documentary
    page.locator('[data-action="convert-idea"]').first.click()
    assert page.locator('form[data-form="project"]').count()==1
    page.locator('form[data-form="project"] button[type="submit"]').click()
    page.wait_for_timeout(700)
    assert page.get_by_text('Production Workflow').first.is_visible()
    assert page.locator('.check-row').count() >= 15
    project_title=page.locator('h1').first.inner_text()
    # Main registry: add two accounts
    page.locator('[data-nav="profiles"]').first.click()
    for account in [('https://www.youtube.com/@salimgpt_smoke','Main Test YouTube'),('https://t.me/sgcc_smoke_channel','Telegram Test Channel')]:
        page.locator('[data-action="new-profile"]').first.click()
        form=page.locator('form[data-form="profile"]')
        form.locator('[name="url"]').fill(account[0]);form.locator('[name="label"]').fill(account[1])
        form.locator('button[type="submit"]').click()
        page.wait_for_timeout(180)
    assert page.get_by_text('Main Test YouTube').first.is_visible()
    # Publishing checklist auto populated
    page.locator('[data-nav="projects"]').first.click()
    page.locator('[data-action="open-project"]').first.click()
    page.locator('[data-action="project-tab"][data-tab="publishing"]').click()
    assert page.locator('.publication-table tbody tr').count()==2
    assert page.get_by_text('Main Test YouTube').first.is_visible()
    # Mark only first as done
    page.locator('tr').filter(has_text='Main Test YouTube').locator('[data-action="toggle-publication"]').click()
    assert page.locator('tr').filter(has_text='Main Test YouTube').get_by_text('Published',exact=True).count()>=1
    assert page.locator('tr').filter(has_text='Telegram Test Channel').get_by_text('Not Published',exact=True).count()>=1
    # New central profile should immediately appear without manual adding to documentary
    page.locator('[data-action="go-profiles"]').click()
    page.locator('[data-action="new-profile"]').click()
    form=page.locator('form[data-form="profile"]');form.locator('[name="url"]').fill('https://www.instagram.com/sgcc_smoke/');form.locator('[name="label"]').fill('Instagram Smoke')
    form.locator('button[type="submit"]').click();page.wait_for_timeout(170)
    page.locator('[data-nav="projects"]').first.click();page.locator('[data-action="open-project"]').first.click();page.locator('[data-action="project-tab"][data-tab="publishing"]').click()
    assert page.locator('.publication-table tbody tr').count()==3, 'Derived checklist did not add new profile'
    assert page.locator('tr').filter(has_text='Main Test YouTube').get_by_text('Published',exact=True).count()>=1, 'Previous Done lost'
    # Reload and check persistence
    page.reload(wait_until='networkidle');page.locator('[data-nav="projects"]').first.click();page.locator('[data-action="open-project"]').first.click();page.locator('[data-action="project-tab"][data-tab="publishing"]').click()
    assert page.locator('.publication-table tbody tr').count()==3
    assert page.locator('tr').filter(has_text='Main Test YouTube').get_by_text('Published',exact=True).count()>=1
    # Reminder create and mark done
    page.locator('[data-nav="reminders"]').first.click();page.locator('[data-action="new-reminder"]').first.click()
    form=page.locator('form[data-form="reminder"]');form.locator('[name="title"]').fill('Call team lead')
    form.locator('button[type="submit"]').click();page.wait_for_timeout(190)
    assert page.get_by_text('Call team lead').first.is_visible()
    page.locator('[data-action="done-reminder"]').first.click();page.wait_for_timeout(150)
    assert page.get_by_text('Completed',exact=True).count()>=1
    # Goals create
    page.locator('[data-nav="goals"]').first.click();page.locator('[data-action="new-goal"]').first.click()
    form=page.locator('form[data-form="goal"]');form.locator('[name="title"]').fill('Complete 10 documentaries')
    form.locator('[name="target"]').fill('10');form.locator('button[type="submit"]').click();page.wait_for_timeout(160)
    assert page.get_by_text('Complete 10 documentaries').first.is_visible()
    # Backup exports; inspect JS directly via page.evaluate? download event
    page.locator('[data-nav="settings"]').first.click()
    with page.expect_download() as download_info: page.locator('[data-action="export-backup"]').first.click()
    download=download_info.value
    assert download.suggested_filename.endswith('.json')
    page.screenshot(path=str(preview_dir/'sgcc-settings-preview.png'),full_page=True)
    assert not errors, 'Browser JS errors: '+str(errors)
    print('SUCCESS',{'project':project_title,'accounts':3,'checklist_auto_sync':'ok','manual_done_persisted':'ok','reminder':'ok','backup':download.suggested_filename,'pageerrors':errors})
    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
    mp=mobile.new_page();mp.goto(url,wait_until='networkidle');mp.screenshot(path=str(preview_dir/'sgcc-mobile-preview.png'),full_page=True)
    print('mobile h1',mp.locator('h1').first.inner_text())
    browser.close()
