package edu.berkeley.xtrace.config;

import java.io.File;
import java.io.IOException;

import junit.framework.TestCase;

import org.junit.Test;

import edu.berkeley.xtrace.IoUtil;
import edu.berkeley.xtrace.OptionField;
import edu.berkeley.xtrace.TaskID;
import edu.berkeley.xtrace.XTraceContext;
import edu.berkeley.xtrace.XTraceEvent;
import edu.berkeley.xtrace.XTraceMetadata;
import edu.berkeley.xtrace.XTraceMetadataCollection;
import edu.berkeley.xtrace.XTraceProcess;
import edu.berkeley.xtrace.config.XTraceConfigurationParser.InvalidConfigurationException;

public class ConfigurationTest extends TestCase {
  
  private void assertDefaults(XTraceLogLevel loglevels) {
    assertTrue(loglevels.defaultEnabled);
    assertEquals(0, loglevels.enabled.size());
    assertEquals(0, loglevels.disabled.size());
    assertTrue(loglevels.enabled(XTraceContext.class));
  }
  
  private void assertActiveIsDefault() {
    assertTrue(XTraceConfiguration.ENABLED);
    XTraceConfiguration conf = XTraceConfiguration.active;
    assertTrue(conf.isEnabled());
    assertDefaults(conf.loglevels);
  }
  
  private void assertNotActive(XTraceConfiguration conf) {
    assertActiveIsDefault();
    assertNotSame(XTraceConfiguration.active, conf);
  }

  @Test
  public void testDefaultConfiguration() {
    assertActiveIsDefault();
  }
  
  @Test
  public void testEmptyConfiguration() throws InvalidConfigurationException, IOException {
    XTraceConfiguration conf = XTraceConfiguration.load(new File("src/test/conf/test-empty.xml"));
    assertTrue(conf.isEnabled());
    assertDefaults(conf.loglevels);    
    assertNotActive(conf);
  }
  
  @Test  
  public void testXTraceEnabled() throws InvalidConfigurationException, IOException {
    XTraceConfiguration enabled = XTraceConfiguration.load(new File("src/test/conf/test-enabled.xml"));
    assertTrue(enabled.isEnabled());
    assertDefaults(enabled.loglevels);

    XTraceConfiguration disabled = XTraceConfiguration.load(new File("src/test/conf/test-disabled.xml"));
    assertFalse(disabled.isEnabled());
    assertDefaults(enabled.loglevels);    
    assertNotActive(enabled);
  }
  
  @Test
  public void testFiltersEnabled() throws InvalidConfigurationException, IOException {
    XTraceConfiguration enabled = XTraceConfiguration.load(new File("src/test/conf/test-filters-enabled.xml"));
    assertTrue(enabled.isEnabled());
    assertDefaults(enabled.loglevels);
  }
  
  @Test
  public void testFiltersDisabled() throws InvalidConfigurationException, IOException {
    XTraceConfiguration disabled = XTraceConfiguration.load(new File("src/test/conf/test-filters-disabled.xml"));
    assertTrue(disabled.isEnabled());
    assertFalse(disabled.loglevels.defaultEnabled);
    assertEquals(0, disabled.loglevels.enabled.size());
    assertEquals(0, disabled.loglevels.disabled.size());
    assertFalse(disabled.loglevels.enabled(XTraceContext.class));    
    assertNotActive(disabled);
  }
  
  @Test
  public void testEnableClass() throws InvalidConfigurationException, IOException {
    XTraceConfiguration enabled = XTraceConfiguration.load(new File("src/test/conf/test-filters-class-enabled.xml"));
    assertTrue(enabled.isEnabled());
    assertTrue(enabled.loglevels.defaultEnabled);
    assertEquals(1, enabled.loglevels.enabled.size());
    assertEquals(0, enabled.loglevels.disabled.size());
    assertTrue(enabled.loglevels.enabled(XTraceContext.class));    
    assertNotActive(enabled);
  }
  
  @Test
  public void testInvalidEnableClass() throws InvalidConfigurationException, IOException {
    try {
      XTraceConfiguration.load(new File("src/test/conf/test-filters-enabled-class-invalid.xml"));
      fail("Configuration successfully parsed, but expected InvalidConfigurationException");
    } catch (InvalidConfigurationException e) {
    }
  }
  
  @Test
  public void testDisableClass() throws InvalidConfigurationException, IOException {
    XTraceConfiguration disabled = XTraceConfiguration.load(new File("src/test/conf/test-filters-class-disabled.xml"));
    assertTrue(disabled.isEnabled());
    assertTrue(disabled.loglevels.defaultEnabled);
    assertEquals(0, disabled.loglevels.enabled.size());
    assertEquals(1, disabled.loglevels.disabled.size());
    assertFalse(disabled.loglevels.enabled(XTraceContext.class));    
    assertNotActive(disabled);
  }
  
  public void testInvalidDisableClass() throws IOException {
    try {
      XTraceConfiguration.load(new File("src/test/conf/test-filters-disabled-class-invalid.xml"));
      fail("Configuration successfully parsed, but expected InvalidConfigurationException");
    } catch (InvalidConfigurationException e) {
    }
  }
  
  @Test
  public void testMultiEnabledDisabled() throws InvalidConfigurationException, IOException {
    XTraceConfiguration multi = XTraceConfiguration.load(new File("src/test/conf/test-filters-class-multi.xml"));
    assertTrue(multi.isEnabled());
    assertTrue(multi.loglevels.defaultEnabled);
    assertEquals(4, multi.loglevels.enabled.size());
    assertTrue(multi.loglevels.enabled(XTraceContext.class));
    assertTrue(multi.loglevels.enabled(XTraceMetadata.class));
    assertTrue(multi.loglevels.enabled(XTraceMetadataCollection.class));
    assertTrue(multi.loglevels.enabled(IoUtil.class));
    assertEquals(4, multi.loglevels.disabled.size());
    assertFalse(multi.loglevels.enabled(XTraceEvent.class));
    assertFalse(multi.loglevels.enabled(XTraceProcess.class));
    assertFalse(multi.loglevels.enabled(OptionField.class));
    assertFalse(multi.loglevels.enabled(TaskID.class));    
    assertNotActive(multi);
  }
  
  @Test
  public void testEnableClassGlobalDisable() throws InvalidConfigurationException, IOException {
    XTraceConfiguration disabled = XTraceConfiguration.load(new File("src/test/conf/test-filters-disabled-classes.xml"));
    assertTrue(disabled.isEnabled());
    assertFalse(disabled.loglevels.defaultEnabled);    
    assertEquals(1, disabled.loglevels.enabled.size());
    assertEquals(1, disabled.loglevels.disabled.size());
    assertFalse(disabled.loglevels.enabled(XTraceContext.class));
    assertFalse(disabled.loglevels.enabled(XTraceEvent.class));
    assertTrue(disabled.loglevels.enabled(XTraceMetadata.class));    
    assertNotActive(disabled);
  }
  
  @Test
  public void testDisableClassGlobalEnable() throws InvalidConfigurationException, IOException {
    XTraceConfiguration enabled = XTraceConfiguration.load(new File("src/test/conf/test-filters-enabled-classes.xml"));
    assertTrue(enabled.isEnabled());
    assertTrue(enabled.loglevels.defaultEnabled);    
    assertEquals(1, enabled.loglevels.enabled.size());
    assertEquals(1, enabled.loglevels.disabled.size());
    assertFalse(enabled.loglevels.enabled(XTraceContext.class));
    assertTrue(enabled.loglevels.enabled(XTraceEvent.class));
    assertTrue(enabled.loglevels.enabled(XTraceMetadata.class));    
    assertNotActive(enabled);
  }
  
  @Test
  public void testFull() throws InvalidConfigurationException, IOException {
    XTraceConfiguration conf = XTraceConfiguration.load(new File("src/test/conf/test-full.xml"));
    assertFalse(conf.isEnabled());
    assertFalse(conf.loglevels.defaultEnabled);    
    assertEquals(4, conf.loglevels.enabled.size());
    assertTrue(conf.loglevels.enabled(XTraceContext.class));
    assertTrue(conf.loglevels.enabled(XTraceMetadata.class));
    assertTrue(conf.loglevels.enabled(XTraceMetadataCollection.class));
    assertTrue(conf.loglevels.enabled(IoUtil.class));
    assertEquals(4, conf.loglevels.disabled.size());
    assertFalse(conf.loglevels.enabled(XTraceEvent.class));
    assertFalse(conf.loglevels.enabled(XTraceProcess.class));
    assertFalse(conf.loglevels.enabled(OptionField.class));
    assertFalse(conf.loglevels.enabled(TaskID.class));    
    assertNotActive(conf);
  }

}
