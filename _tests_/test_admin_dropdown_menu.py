from selenium import webdriver
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
import time

driver = webdriver.Chrome() 
driver.get("http://localhost:3001")
driver.maximize_window()

email_input = driver.find_element(By.NAME, "email")
password_input = driver.find_element(By.NAME, "password")
    
email_input.send_keys("admin@email.com")
password_input.send_keys("password")
password_input.send_keys(Keys.RETURN)
time.sleep(2)

# Locate dropdown content
dropdown = driver.find_element(By.CLASS_NAME, "dropdown-content")
links = dropdown.find_elements(By.TAG_NAME, "a")  # Locate all links

# Verify expected links are present
expected_links = {
    "Google Calendar": "https://calendar.google.com/",
    "Settings": "/settings.html",
    "Logout": "/index.html"
}

for link_text, expected_url in expected_links.items():
    # Locate and click the dropdown trigger
    trigger = driver.find_element(By.CSS_SELECTOR, ".dropdown button")
    trigger.click()
    time.sleep(2)

    link = driver.find_element(By.LINK_TEXT, link_text)
    link.click()
    time.sleep(2)  # Allow time for navigation

    current_url = driver.current_url

    if "calendar.google.com" in expected_url:
        assert "calendar" in current_url.lower(), f"Navigation failed for {link_text}. Got: {current_url}"
    else:
        assert expected_url in current_url, f"Navigation failed for {link_text}. Expected part of: {expected_url}, got: {current_url}"
    
    print(f"Successfully navigated to {link_text}: {current_url}")  # Confirmation message
    driver.back()  # Go back to test the next link
    time.sleep(2)


try:
    driver.find_element(By.CLASS_NAME, "dropdown-content")
    print("Dropdown still visible after selection!")
except NoSuchElementException:
    print("Dropdown correctly closed.")

driver.quit()