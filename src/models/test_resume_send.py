from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os

EMAIL = "rhalili@csus.com"
PASSWORD = "1"
BASE_URL = "http://localhost:3001"  
DOWNLOADS_PATH = "C:/Users/rheyp/Downloads"  

FILES_TO_SEND = ["test.pdf", "test.docx", "test.txt", "test.zip"]

driver = webdriver.Chrome()  
driver.maximize_window()

try:
    driver.get(BASE_URL)
    
    email_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.NAME, "email"))
    )
    password_input = driver.find_element(By.NAME, "password")
    
    email_input.send_keys(EMAIL)
    password_input.send_keys(PASSWORD)
    password_input.send_keys(Keys.RETURN)
    
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//div[@class='dropdown']/button"))
    )
    
    for file_name in FILES_TO_SEND:
        dropdown_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@class='dropdown']/button"))
        )
        dropdown_button.click()
        
        settings_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@class='dropdown-content']/a[contains(text(), 'Settings')]"))
        )
        settings_link.click()
        
        first_name_input = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.ID, "first_name"))
        )
        
        first_name_input.clear()
        first_name_input.send_keys("Rey")
        
        last_name_input = driver.find_element(By.ID, "last_name")
        last_name_input.clear()
        last_name_input.send_keys("Halili")
        
        email_field = driver.find_element(By.ID, "email")
        email_field.clear()
        email_field.send_keys("rhalili.csus.com")
        
        zipcode_field = driver.find_element(By.ID, "zipcode")
        zipcode_field.clear()
        zipcode_field.send_keys("95757")
        
        degree_select = Select(driver.find_element(By.NAME, "degree"))
        degree_select.select_by_value("bachelor") 
        
        resume_input = driver.find_element(By.ID, "resume")
        file_path = os.path.join(DOWNLOADS_PATH, file_name)
        resume_input.send_keys(file_path)
        
        save_button = driver.find_element(By.XPATH, "//button[text()='Save and Continue']")
        save_button.click()
        
        try:
            WebDriverWait(driver, 10).until(
                EC.url_contains("user_dashboard.html")
            )
            print(f"Submitted file: {file_name} and navigated to user_dashboard.html successfully.")
        except TimeoutException:
            print(f"Test failed: After submitting {file_name}, the page did not navigate to user_dashboard.html.")
            break
        
        if file_name == "test.zip":
            print("Test complete: test.zip file submitted. Exiting loop.")
            break
        
        time.sleep(2)
        
finally:
    time.sleep(3)
    driver.quit()
