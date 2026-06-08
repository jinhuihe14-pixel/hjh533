import { useState } from 'react';
import { Form, Input, Button, Card, Select, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../App';

interface LocationState {
  from?: { pathname: string };
}

const demoAccounts = [
  { label: '需求方 - 华科精密', value: 'huake_buyer' },
  { label: '供应商 - 鑫源钢材', value: 'xinyuan_sales' },
  { label: '加工厂 - 精工机械', value: 'jinggong_manager' },
  { label: '加工厂 - 腾达精密', value: 'tengda_engineer' },
  { label: '系统管理员', value: 'admin' }
];

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthContext();

  const state = location.state as LocationState;
  const from = state?.from?.pathname || '/dashboard';

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (error: any) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (username: string) => {
    form.setFieldsValue({ username, password: 'password123' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">供应链协同平台</h1>
        <p className="login-subtitle">零部件集采 + 外协加工协同管理系统</p>
        
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          initialValues={{ username: 'huake_buyer', password: 'password123' }}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="密码" 
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>快速登录（演示账号）：</div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择演示账号"
              options={demoAccounts}
              onSelect={handleQuickLogin}
              allowClear
            />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
