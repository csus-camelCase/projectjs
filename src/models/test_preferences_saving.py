from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Set up driver (ensure correct WebDriver is installed and in PATH)
driver = webdriver.Chrome()

try:
    # Open login page
    driver.get("http://localhost:3001")

    # Log in
    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")
    
    email_input.send_keys("kennyahntest1@email.com")
    password_input.send_keys("Password98?")
    password_input.send_keys(Keys.RETURN)

    time.sleep(2)

    # Wait for dashboard to load and click Edit Account Preferences
    wait = WebDriverWait(driver, 10)
    edit_button = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(), 'Edit Account Preferences')]")))
    edit_button.click()

    time.sleep(2)

    # Wait for preferences page
    search_input = wait.until(EC.presence_of_element_located((By.ID, "searchInput")))

    # Valid input test
    valid_pref = "Work From Home"
    search_input.clear()
    search_input.send_keys(valid_pref)
    time.sleep(2)  

    try:
        result_item = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "result-item")))
        print(" Valid preference searched and appeared.")
        result_item.click()
        print(" Preference selected.")
    except:
        print(" Valid preference not found in results.")

    time.sleep(2)

    # Click Save Preferences
    save_button = driver.find_element(By.ID, "saveBtn")
    save_button.click()
    print(" Clicked Save Preferences")

    time.sleep(2)

    # Handle alert popup
    alert = WebDriverWait(driver, 5).until(EC.alert_is_present())
    alert.accept()  # Press the "OK" button

    time.sleep(2)

    # Wait for redirection to dashboard
    wait.until(EC.url_contains("user_dashboard.html"))

    time.sleep(2)

    # Click "Edit Account Preferences" again
    edit_button = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(), 'Edit Account Preferences')]")))
    edit_button.click()

    time.sleep(2)

    # Verify the preference appears in the selected tags
    wait.until(EC.presence_of_element_located((By.ID, "selectedTags")))
    selected_tags = driver.find_elements(By.CLASS_NAME, "tag")

    found = any(valid_pref in tag.text for tag in selected_tags)
    if found:
        print(f"'{valid_pref}' is still selected after reload.")
    else:
        print(f"'{valid_pref}' not found in saved preferences.")

    # Find all tags (selected preferences)
    selected_tags = driver.find_elements(By.CLASS_NAME, "tag")
    target_pref = "Work From Home"
    removed = False

    # Loop through each tag and find the matching one
    for tag in selected_tags:
        if target_pref in tag.text:
            remove_btn = tag.find_element(By.CLASS_NAME, "remove-btn")
            remove_btn.click()
            print(f"Removed '{target_pref}' preference.")
            removed = True
            break

    if not removed:
        print(f"Could not find '{target_pref}' to remove.")

    time.sleep(2)

    # Click Save Preferences
    save_button = driver.find_element(By.ID, "saveBtn")
    save_button.click()
    print(" Clicked Save Preferences")

    time.sleep(2)

    # Handle alert popup
    alert = WebDriverWait(driver, 5).until(EC.alert_is_present())
    alert.accept()  # Press the "OK" button
    
    time.sleep(2)

    # Click "Edit Account Preferences" again
    edit_button = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(), 'Edit Account Preferences')]")))
    edit_button.click()

    time.sleep(2)

    # Skip button test
    skip_button = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.ID, "skipBtn"))
    )
    skip_button.click()
    print("Clicked 'Skip' button.")

    time.sleep(2)

    # Verify redirect to dashboard
    try:
        WebDriverWait(driver, 5).until(EC.url_contains("user_dashboard.html"))
        print("Successfully redirected to user dashboard after skipping.")
    except:
       print("Did not redirect to dashboard after skipping.")    

finally:
    time.sleep(3)
    driver.quit()
