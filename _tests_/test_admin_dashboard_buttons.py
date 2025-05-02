from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Set up driver (ensure correct WebDriver is installed and in PATH)
driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

try:
    # Open login page
    driver.get("http://localhost:3001")

    # Log in
    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")
    
    email_input.send_keys("admin@email.com")
    password_input.send_keys("password")
    password_input.send_keys(Keys.RETURN)

    time.sleep(2)

    # Buttons to test: (visible button text, expected URL fragment)
    buttons = [
        ("Create Event", "schedule-event"),
        ("Admin Search", "adminSearch"),
        ("Candidate Search", "search"),
        ("Manage Preferences", "manage-preferences"),
        ("Send Emails", "send-emails")
    ]

    for text, expected_url in buttons:
        print(f"\nTesting: {text}")

        # Click the button using visible text
        btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, f"//button[normalize-space()='{text}']")))
        btn.click()

        # Verify navigation
        wait.until(EC.url_contains(expected_url))
        if expected_url in driver.current_url:
            print(f"Navigated to: {driver.current_url}")
        else:
            print(f"Failed to navigate to {expected_url}. Got: {driver.current_url}")

        time.sleep(2)

        # Click "Back to Dashboard"
        back_link = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//a[normalize-space()='Back to Dashboard']")))
        back_link.click()

        wait.until(EC.url_contains("admin_dashboard"))
        print("Returned to Admin Dashboard")

        time.sleep(2)

finally:
    driver.quit()