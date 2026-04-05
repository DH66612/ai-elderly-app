/**
 * 法律文档页面路由
 * 提供隐私政策和用户协议的公网访问
 */
import express from 'express';

const router = express.Router();

// 通用HTML模板
function renderPage(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - AI助老</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(135deg, #b8e0e8 0%, #f0f5fa 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    h1 {
      color: #2d4c6e;
      font-size: 24px;
      text-align: center;
      margin-bottom: 8px;
    }
    .update-time {
      color: #8fa5bb;
      font-size: 13px;
      text-align: center;
      margin-bottom: 32px;
    }
    h2 {
      color: #2d4c6e;
      font-size: 17px;
      margin: 24px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eaf0f5;
    }
    p, li {
      color: #5e7e9f;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 8px;
    }
    ul { padding-left: 20px; }
    strong { color: #2d4c6e; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eaf0f5;
      text-align: center;
      color: #8fa5bb;
      font-size: 13px;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo-text {
      font-size: 28px;
      font-weight: 700;
      color: #8ab3cf;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-text">AI助老</span></div>
    ${content}
    <div class="footer">
      © 2024 AI助老 - 智能养老助手
    </div>
  </div>
</body>
</html>`;
}

/**
 * 隐私政策页面
 * GET /api/v1/legal/privacy-policy
 */
router.get('/privacy-policy', (req, res) => {
  const content = `
    <h1>隐私政策</h1>
    <p class="update-time">更新日期：2024年1月1日</p>
    
    <h2>一、引言</h2>
    <p>AI助老（以下简称「我们」）高度重视用户隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。请您在使用本应用前仔细阅读本政策。</p>
    
    <h2>二、信息收集</h2>
    <p>我们收集以下类型的信息：</p>
    <p><strong>1. 注册信息</strong></p>
    <ul>
      <li>姓名、手机号</li>
      <li>角色（老人端/监护人端）</li>
      <li>家庭地址、社区电话、家人电话（老人端）</li>
    </ul>
    <p><strong>2. 健康数据</strong></p>
    <ul>
      <li>心率、血压、血氧、步数、睡眠等健康指标</li>
      <li>通过华为/荣耀智能穿戴设备自动采集</li>
      <li>通过蓝牙健康手环自动采集</li>
    </ul>
    <p><strong>3. 位置信息</strong></p>
    <ul>
      <li>用于天气定位和紧急救援</li>
      <li>需您授权后才会获取</li>
    </ul>
    <p><strong>4. 设备信息</strong></p>
    <ul>
      <li>设备型号、操作系统版本</li>
      <li>应用使用日志</li>
    </ul>
    
    <h2>三、信息使用</h2>
    <p>我们使用收集的信息用于：</p>
    <ul>
      <li>提供、维护和改进我们的服务</li>
      <li>向监护人推送老人健康数据</li>
      <li>紧急情况下协助救援</li>
      <li>发送服务通知和健康提醒</li>
      <li>改进用户体验和开发新功能</li>
    </ul>
    
    <h2>四、信息共享</h2>
    <ul>
      <li>我们不会向第三方出售您的个人信息。</li>
      <li>监护人可以查看其绑定老人的健康数据和位置信息。</li>
      <li>我们仅在必要时与授权的服务提供商共享数据（如云存储服务商、华为运动健康服务）。</li>
      <li>法律法规要求时，我们会依法配合。</li>
    </ul>
    
    <h2>五、信息存储与安全</h2>
    <ul>
      <li>我们采用业界标准的安全措施保护您的数据。</li>
      <li>数据传输采用HTTPS加密技术。</li>
      <li>数据存储在安全的服务器上，限制访问权限。</li>
      <li>我们会定期审查和更新安全措施。</li>
    </ul>
    
    <h2>六、您的权利</h2>
    <ul>
      <li>您有权访问和更正您的个人信息。</li>
      <li>您有权删除您的账号和相关数据。</li>
      <li>您有权撤销位置等敏感信息的授权。</li>
      <li>您有权解除与他人的绑定关系。</li>
    </ul>
    
    <h2>七、华为健康数据</h2>
    <p>当您授权我们访问华为运动健康数据时：</p>
    <ul>
      <li>我们仅获取您授权范围内的健康数据。</li>
      <li>数据仅用于健康监测和分析目的。</li>
      <li>您可以随时在华为健康设置中撤销授权。</li>
      <li>撤销授权后，我们将停止获取并删除相关数据。</li>
    </ul>
    
    <h2>八、未成年人保护</h2>
    <p>本应用主要面向老年人及其监护人。如果您是未成年人，请在监护人的陪同下使用本应用，我们不会主动收集未成年人的个人信息。</p>
    
    <h2>九、政策更新</h2>
    <p>我们可能会不时更新本隐私政策。更新后的政策将在应用内公布，请您定期查阅。继续使用本应用即表示您同意更新后的政策。</p>
    
    <h2>十、联系我们</h2>
    <p>如您对隐私政策有任何疑问，请通过应用内的反馈功能联系我们。我们将在15个工作日内回复您的请求。</p>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderPage('隐私政策', content));
});

/**
 * 用户协议页面
 * GET /api/v1/legal/user-agreement
 */
router.get('/user-agreement', (req, res) => {
  const content = `
    <h1>用户服务协议</h1>
    <p class="update-time">更新日期：2024年1月1日</p>
    
    <h2>一、服务说明</h2>
    <p>AI助老是一款专为老年人和监护人设计的智能健康管理应用。本应用提供健康数据监测、紧急呼叫、视频通话、语音助手等功能，旨在帮助老年人更好地生活，同时让监护人能够实时了解老人的健康状况。</p>
    
    <h2>二、用户注册</h2>
    <ul>
      <li>用户在使用本应用前需要完成注册，填写真实、准确的个人信息。</li>
      <li>老人端用户需填写家庭地址、社区电话、家人联系电话等紧急联系信息。</li>
      <li>监护人端用户需与老人端用户完成绑定后，方可查看老人健康数据。</li>
      <li>用户应妥善保管账号信息，因账号保管不当造成的损失由用户自行承担。</li>
    </ul>
    
    <h2>三、用户行为规范</h2>
    <ul>
      <li>用户不得利用本应用从事违法违规活动。</li>
      <li>用户不得干扰本应用的正常运行。</li>
      <li>用户不得恶意呼叫紧急救援功能，以免占用公共资源。</li>
      <li>用户应遵守相关法律法规，尊重他人合法权益。</li>
    </ul>
    
    <h2>四、服务内容</h2>
    <ul>
      <li><strong>健康数据监测：</strong>通过华为/荣耀智能穿戴设备或蓝牙健康手环采集心率、血压、血氧、步数、睡眠等健康数据。</li>
      <li><strong>紧急呼叫：</strong>一键呼叫监护人或紧急服务。</li>
      <li><strong>视频通话：</strong>老人与监护人之间的视频通话服务。</li>
      <li><strong>语音助手：</strong>AI语音交互，协助老人完成日常操作。</li>
      <li><strong>位置定位：</strong>实时获取老人位置信息（需授权）。</li>
      <li><strong>健康分析：</strong>AI智能分析健康趋势，提供健康建议。</li>
    </ul>
    
    <h2>五、华为健康服务</h2>
    <p>本应用集成华为运动健康服务，支持以下功能：</p>
    <ul>
      <li>通过OAuth授权连接华为/荣耀智能手表、手环</li>
      <li>获取心率、步数、睡眠、血压、血氧等健康数据</li>
      <li>数据同步和分析</li>
    </ul>
    <p>使用华为健康服务即表示您同意华为的运动健康服务条款。</p>
    
    <h2>六、免责声明</h2>
    <ul>
      <li>本应用提供的健康数据仅供参考，不构成医疗诊断建议。</li>
      <li>因网络、设备等不可抗力因素导致的服务中断，本应用不承担责任。</li>
      <li>用户因使用本应用产生的纠纷，应通过友好协商解决。</li>
    </ul>
    
    <h2>七、知识产权</h2>
    <p>本应用的所有内容，包括但不限于文字、图片、软件、界面设计等，均受著作权法等知识产权法律保护。未经授权，任何人不得复制、传播或用于商业目的。</p>
    
    <h2>八、协议修改</h2>
    <p>本应用有权根据需要修改本协议内容，修改后的协议将在应用内公布。继续使用本应用即视为用户同意修改后的协议。</p>
    
    <h2>九、法律适用与争议解决</h2>
    <p>本协议的订立、履行、解释及争议解决均适用中华人民共和国法律。如发生争议，双方应友好协商解决；协商不成的，可向本应用所在地人民法院提起诉讼。</p>
    
    <h2>十、联系我们</h2>
    <p>如有任何问题或建议，请通过应用内的反馈功能联系我们。</p>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderPage('用户服务协议', content));
});

export default router;
