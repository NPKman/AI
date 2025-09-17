const keyNames = [
  'G_ChargerMode',
  'G_ServerURL',
  'G_ServerURL2',
  'G_MaxCurrent',
  'G_MaxCurrentC',
  'G_MaxCurrentD',
  'G_ChargerID',
  'G_ChargerRate',
  'G_CardPin',
  'G_ChargerLanguage',
  'G_MaxPower',
  'G_MaxPowerA',
  'G_MaxPowerB',
  'G_MaxPowerC',
  'G_MaxPowerD',
  'G_MaxPowerE',
  'G_MaxPowerF',
  'G_MaxPowerG',
  'G_MaxPowerH',
  'G_ChargerNetIP',
  'G_ChargerNetGateway',
  'G_ChargerNetMac',
  'G_ChargerNetMask',
  'G_ChargerNetDNS',
  'G_Authentication',
  'G_MaxTemperature',
  'G_ChargerType',
  'UserPassword',
  'UserPassword2',
  'G_ChargerSN',
  'G_DSPVerA',
  'G_DSPVerB',
  'G_SECCVerA',
  'G_SECCVerB',
  'G_LCD_SCREEN',
  'EvccMacB',
  'EvccMacA',
  'G_HearbeatInterval',
  'G_WebSocketPingInterval',
  'G_MeterValueInterval',
  'AdminPassword',
  'G_LowTemperature',
  'G_InsInChargingEnable',
  'G_RemoteControlGroup',
  'G_RemoteStartGroup',
];

const ipInput = document.getElementById('ipaddress');
const commandInputs = Array.from(document.querySelectorAll('input[name="command"]'));
const keySelect = document.getElementById('key_name');
const keyValueInput = document.getElementById('key_value');
const customToggle = document.getElementById('customToggle');
const jsonOutput = document.getElementById('jsonOutput');
const form = document.getElementById('commandForm');
const feedback = document.getElementById('feedback');
const copyButton = document.getElementById('copyJson');

const IP_PATTERN = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/;

function populateKeyNames() {
  const fragment = document.createDocumentFragment();
  keyNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    fragment.appendChild(option);
  });
  keySelect.appendChild(fragment);
}

function getSelectedCommand() {
  const selected = commandInputs.find((input) => input.checked);
  return selected ? selected.value : 'get_config';
}

function isCustomMode() {
  return customToggle.checked;
}

function setKeyValueState(command) {
  const shouldEnable = command === 'set_config' && !isCustomMode();
  keyValueInput.disabled = !shouldEnable;
  if (!shouldEnable && command !== 'set_config') {
    keyValueInput.value = '';
  }
}

function setFormInteractivity() {
  const custom = isCustomMode();
  [ipInput, keySelect, keyValueInput, ...commandInputs].forEach((element) => {
    if (element === keyValueInput) {
      setKeyValueState(getSelectedCommand());
    } else {
      element.disabled = custom;
    }
  });
  if (!custom) {
    setKeyValueState(getSelectedCommand());
  }
  jsonOutput.readOnly = !custom;
  jsonOutput.classList.toggle('editable', custom);
}

function buildGuidedPayload() {
  const ip = ipInput.value.trim();
  const command = getSelectedCommand();
  const key = keySelect.value;
  const keyValue = keyValueInput.value.trim();

  if (!IP_PATTERN.test(ip)) {
    return { error: 'กรุณากรอก IP Address ให้ถูกต้อง (เช่น 10.101.1.35).' };
  }

  if (!key) {
    return { error: 'กรุณาเลือก Key name.' };
  }

  if (command === 'set_config' && keyValue.length === 0) {
    return { error: 'ต้องกรอก key_value เมื่อเลือก set_config.' };
  }

  const payload = {
    charger: {
      ipaddress: ip,
      command,
      key_name: key,
    },
  };

  if (command === 'set_config') {
    payload.charger.key_value = keyValue;
  }

  return { payload };
}

function updateJsonPreview() {
  if (isCustomMode()) {
    return;
  }
  const { payload, error } = buildGuidedPayload();
  if (error) {
    jsonOutput.value = error;
    return;
  }
  jsonOutput.value = JSON.stringify(payload, null, 2);
}

function displayFeedback(message, type = 'neutral') {
  feedback.textContent = message || '';
  feedback.className = `feedback${type !== 'neutral' ? ` ${type}` : ''}`;
}

async function handleSubmit(event) {
  event.preventDefault();
  displayFeedback('กำลังส่งคำสั่ง...', 'neutral');

  let body;

  if (isCustomMode()) {
    const raw = jsonOutput.value.trim();
    if (!raw) {
      displayFeedback('กรุณาระบุ JSON ที่ต้องการส่ง', 'error');
      return;
    }
    try {
      JSON.parse(raw);
    } catch (error) {
      displayFeedback('รูปแบบ JSON ไม่ถูกต้อง', 'error');
      return;
    }
    body = {
      mode: 'custom',
      payload: raw,
    };
  } else {
    const { payload, error } = buildGuidedPayload();
    if (error) {
      displayFeedback(error, 'error');
      return;
    }
    body = {
      mode: 'guided',
      fields: {
        ipaddress: payload.charger.ipaddress,
        command: payload.charger.command,
        key_name: payload.charger.key_name,
        key_value: payload.charger.key_value,
      },
    };
  }

  try {
    const response = await fetch('/api/send-command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      const message = result.error || 'ไม่สามารถส่งคำสั่งได้';
      displayFeedback(message, 'error');
      return;
    }

    const renderedPayload = JSON.stringify(result.payload, null, 2);
    if (!isCustomMode()) {
      jsonOutput.value = renderedPayload;
    }
    displayFeedback('ส่งคำสั่งสำเร็จ (routed: ' + result.routed + ')', 'success');
  } catch (error) {
    console.error(error);
    displayFeedback('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
  }
}

function handleCopy() {
  const text = jsonOutput.value.trim();
  if (!text) {
    displayFeedback('ไม่มีข้อมูลสำหรับคัดลอก', 'error');
    return;
  }
  if (!navigator.clipboard) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const succeeded = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (succeeded) {
        displayFeedback('คัดลอก JSON แล้ว', 'success');
      } else {
        displayFeedback('ไม่สามารถคัดลอกได้', 'error');
      }
    } catch (error) {
      displayFeedback('ไม่สามารถคัดลอกได้', 'error');
    }
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => displayFeedback('คัดลอก JSON แล้ว', 'success'))
    .catch(() => displayFeedback('ไม่สามารถคัดลอกได้', 'error'));
}

populateKeyNames();
updateJsonPreview();
setFormInteractivity();

form.addEventListener('submit', handleSubmit);
commandInputs.forEach((input) => {
  input.addEventListener('change', () => {
    setKeyValueState(getSelectedCommand());
    updateJsonPreview();
  });
});

[ipInput, keySelect, keyValueInput].forEach((element) => {
  element.addEventListener('input', updateJsonPreview);
});

customToggle.addEventListener('change', () => {
  const custom = isCustomMode();
  setFormInteractivity();
  if (!custom) {
    updateJsonPreview();
    return;
  }
  try {
    JSON.parse(jsonOutput.value);
  } catch (error) {
    const { payload, error: buildError } = buildGuidedPayload();
    if (!buildError && payload) {
      jsonOutput.value = JSON.stringify(payload, null, 2);
    } else {
      jsonOutput.value = '';
    }
  }
});

copyButton.addEventListener('click', handleCopy);
