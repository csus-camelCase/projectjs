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
    
    #email_input.send_keys("kennyahn@email.com")
    #password_input.send_keys("password")

    email_input.send_keys("sewey@gmail.com")
    password_input.send_keys("Testing1234!")

    password_input.send_keys(Keys.RETURN)  # Press Enter to log in

    time.sleep(3)

    #Open dropdown menu
    menu_button = driver.find_element(By.XPATH, "//div[@class='dropdown']//button")
    ActionChains(driver).move_to_element(menu_button).click().perform()

    time.sleep(3)

    #Google Calenders
    settings_link = driver.find_element(By.LINK_TEXT, "Google Calendar")
    settings_link.click()

    time.sleep(3)

    driver.back()

    print("Google Calander test passed!")

    time.sleep(3)

    menu_button = driver.find_element(By.XPATH, "//div[@class='dropdown']//button")
    ActionChains(driver).move_to_element(menu_button).click().perform()

    time.sleep(3)


    settings_link = driver.find_element(By.LINK_TEXT, "Settings")
    settings_link.click()

    time.sleep(3)

    print("Settings test passed!")

    driver.back()

     #Click "Logout" button
    settings_link = driver.find_element(By.LINK_TEXT, "Logout")
    settings_link.click()

    print("Logout test passed!")

    time.sleep(3)

    print("Dropdown menu test passed!")

except Exception as e:
    print(f"Test failed: {e}")

finally:
    # Close the browser
    driver.quit()