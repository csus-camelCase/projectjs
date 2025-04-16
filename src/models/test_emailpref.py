from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.alert import Alert
import time

driver = webdriver.Chrome()

try:
    # Open login page
    driver.get("http://localhost:3001")  # Change URL to match your server

    # Log in
    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")
    
    email_input.send_keys("admin@email.com")
    password_input.send_keys("password")
    password_input.send_keys(Keys.RETURN)  # Press Enter to log in

    time.sleep(3)

    #click Send emails
    menu_button = driver.find_element(By.XPATH,"//button[text()='Send Emails']")
    menu_button.click()

    time.sleep(3)

    #test the Search
    search_input = driver.find_element(By.ID, "preferenceSearch")
    search_input.send_keys("job")

    time.sleep(3)

    #scroll
    scroll = driver.find_element(By.XPATH, "//tbody/tr[7]")
    driver.execute_script("arguments[0].scrollIntoView();", scroll)

    time.sleep(3)
    print("Emailer UI test passed!")

except Exception as e:
    print(f"Test failed: {e}")

finally:
    # Close the browser
    driver.quit()