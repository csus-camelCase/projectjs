from selenium import webdriver
from selenium.webdriver.chrome.service import Service 
from selenium.webdriver.chrome.options import Options 
from webdriver_manager.chrome import ChromeDriverManager  
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import time

# Configuration
BASE_URL = "http://localhost:3001" 
LOGIN_URL = f"{BASE_URL}/index.html"
SETTINGS_URL = f"{BASE_URL}/settings.html"
ADMIN_DASHBOARD_URL = f"{BASE_URL}/admin_dashboard.html"

# Admin test credentials 
ADMIN_EMAIL = "Jacobadmin@test.com" 
ADMIN_PASSWORD = "$Password123"   

# Test file paths
TEST_RESUME_PATH = os.path.abspath("test_resume.pdf")  # dummy pdf

def setup_driver():
    """Initialize and return a Chrome WebDriver"""
    options = Options()
    options.add_argument("--start-maximized")
    
    # Let webdriver-manager automatically find the correct version
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    
    driver.implicitly_wait(10)
    return driver

def admin_login(driver, email, password):
    """Log in as admin"""
    print("Logging in as admin...")
    driver.get(LOGIN_URL)
    
    # Wait for form to be present
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "form"))
    )
    
    # Find elements using the updated selectors
    email_field = driver.find_element(By.CSS_SELECTOR, "input[name='email']")
    password_field = driver.find_element(By.CSS_SELECTOR, "input[name='password']")
    
    # Clear fields and enter credentials
    email_field.clear()
    email_field.send_keys(email)
    
    password_field.clear()
    password_field.send_keys(password)
    
    # Submit the form
    login_button = driver.find_element(By.CSS_SELECTOR, "button.btn[type='submit']")
    login_button.click()
    
    # Wait for admin dashboard to load - checking for admin header
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "admin-header"))
        )
        print("Admin login successful - dashboard loaded")
    except Exception as e:
        # Check for error messages
        error_messages = driver.find_elements(By.CSS_SELECTOR, ".error-message")
        if error_messages:
            for error in error_messages:
                if error.is_displayed():
                    print(f"Login failed: {error.text}")
        raise Exception("Admin login failed - dashboard not loaded")

def verify_admin_dashboard(driver):
    """Verify we're on the admin dashboard page"""
    print("Verifying admin dashboard elements...")
    try:
        # Check for admin-specific elements
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "admin-dash"))
        )
        print("Admin dashboard verification successful")
        return True
    except Exception as e:
        print(f"Admin dashboard verification failed: {str(e)}")
        return False

def navigate_to_settings_from_admin(driver):
    """Navigate to settings page from admin dashboard"""
    print("Navigating to settings from admin dashboard...")
    try:
        # Click the admin menu button
        menu_button = driver.find_element(By.CSS_SELECTOR, ".admin-header .dropdown button")
        menu_button.click()
        
        # Wait for dropdown to appear and click settings link
        settings_link = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//a[@href='/settings.html']"))
        )
        settings_link.click()
        
        # Verify we're on settings page
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "first_name"))
        )
        print("Successfully navigated to settings from admin dashboard")
    except Exception as e:
        print(f"Failed to navigate to settings: {str(e)}")
        raise

def test_admin_settings_update(driver):
    """Test updating admin settings"""
    print("\nTesting admin settings update...")
    
    # Get current values
    first_name = driver.find_element(By.ID, "first_name").get_attribute("value")
    last_name = driver.find_element(By.ID, "last_name").get_attribute("value")
    email = driver.find_element(By.ID, "email").get_attribute("value")
    
    # Generate new test values
    new_first_name = "AdminFirst" if first_name != "AdminFirst" else "AdminFirstUpdated"
    new_last_name = "AdminLast" if last_name != "AdminLast" else "AdminLastUpdated"
    new_email = "admin_updated@example.com" if email != "admin_updated@example.com" else "admin@example.com"
    new_degree = "phd"  # Testing highest degree level for admin
    
    # Update fields
    first_name_field = driver.find_element(By.ID, "first_name")
    first_name_field.clear()
    first_name_field.send_keys(new_first_name)
    
    last_name_field = driver.find_element(By.ID, "last_name")
    last_name_field.clear()
    last_name_field.send_keys(new_last_name)
    
    email_field = driver.find_element(By.ID, "email")
    email_field.clear()
    email_field.send_keys(new_email)
    
    degree_select = Select(driver.find_element(By.NAME, "degree"))
    degree_select.select_by_value(new_degree)
    
    # Upload test resume
    resume_field = driver.find_element(By.ID, "resume")
    resume_field.send_keys(TEST_RESUME_PATH)
    
    # Submit the form
    submit_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Save and Continue')]")
    submit_button.click()
    
    # Wait for redirect to admin dashboard 
    try:
        WebDriverWait(driver, 10).until(
            EC.url_to_be(ADMIN_DASHBOARD_URL)
        )
        print("Settings saved successfully - redirected to admin dashboard")
    except Exception as e:
        print(f"Failed to verify admin dashboard redirect: {str(e)}")
        raise
    
    # Verify changes by revisiting settings page
    print("Verifying all changes...")
    navigate_to_settings_from_admin(driver)
    
    # Check if values were updated
    assert driver.find_element(By.ID, "first_name").get_attribute("value") == new_first_name
    assert driver.find_element(By.ID, "last_name").get_attribute("value") == new_last_name
    assert driver.find_element(By.ID, "email").get_attribute("value") == new_email
    
    degree_select = Select(driver.find_element(By.NAME, "degree"))
    assert degree_select.first_selected_option.get_attribute("value") == new_degree
    
    # Check if resume upload status shows
    resume_status = driver.find_element(By.CLASS_NAME, "resume-status").text
    assert "✓ Resume uploaded" in resume_status
    
    print("All admin settings changes verified successfully")

def main():
    driver = setup_driver()
    try:
        # Test admin login
        admin_login(driver, ADMIN_EMAIL, ADMIN_PASSWORD)
        
        # Verify admin dashboard loaded
        if not verify_admin_dashboard(driver):
            raise Exception("Admin dashboard verification failed")
        
        # Navigate to settings through the admin menu
        navigate_to_settings_from_admin(driver)
        
        # Test admin settings update
        test_admin_settings_update(driver)
        
        print("\nAll admin tests passed successfully!")
        
    except Exception as e:
        print(f"\nAdmin test failed: {str(e)}")
        # Take screenshot on failure
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        driver.save_screenshot(f"admin_test_failure_{timestamp}.png")
        raise e
    finally:
        driver.quit()

if __name__ == "__main__":
    main()