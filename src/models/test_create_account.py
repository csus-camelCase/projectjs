from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.alert import Alert
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

driver = webdriver.Chrome()

try:
    # Open login page
    driver.get("http://localhost:3001")

    # Go to sign-up page
    sign_up = driver.find_element(By.LINK_TEXT, "Sign-Up")
    sign_up.click()

    time.sleep(2)

    # Test 1: missing input field
    def test_empty_input():
        driver.find_element(By.NAME, "first_name").send_keys("")
        driver.find_element(By.NAME, "last_name").send_keys("Smith")
        driver.find_element(By.NAME, "username").send_keys("BobSmith123")
        driver.find_element(By.NAME, "email").send_keys("bob.smith@example.com")
        driver.find_element(By.NAME, "password").send_keys("StrongPassword123!")
        driver.find_element(By.NAME, "confirm_password").send_keys("StrongPassword123!")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        # Check for error messages
        empty_input_errors = driver.find_elements(By.CSS_SELECTOR, "input:invalid")
        if empty_input_errors:
            print("Empty Input Test: Pass")
        else:
            print("Empty Input Test: Fail")

    # Test 2: non-matching passwords
    def test_non_matching_passwords():
        driver.find_element(By.NAME, "first_name").send_keys("Bob")
        driver.find_element(By.NAME, "last_name").send_keys("Smith")
        driver.find_element(By.NAME, "username").send_keys("BobSmith123")
        driver.find_element(By.NAME, "email").send_keys("bob.smith@example.com")
        driver.find_element(By.NAME, "password").send_keys("StrongPassword123!")
        driver.find_element(By.NAME, "confirm_password").send_keys("StrongPassword12!")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        # Check for error messages
    try:
        match_error_element = WebDriverWait(driver, 10).until(
            EC.text_to_be_present_in_element((By.ID, "matchError"), "Passwords do not match!")
        )
        print("Test Passed: Match error displayed correctly:", match_error_element)
    except:
        print("Test Failed: Match error not displayed or incorrect")
    # Executing tests
    test_empty_input()
    time.sleep(2)
    driver.refresh()
    time.sleep(2)
    test_non_matching_passwords()
    time.sleep(2)
    driver.refresh()
    time.sleep(2)
    
finally:
    # Close the browser
    driver.quit()