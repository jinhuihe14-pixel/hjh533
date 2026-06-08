import { useState, useEffect } from 'react';
import { Card, Button, Space, message, Modal, Form, Input, InputNumber, List, Tag, Row, Col, Divider } from 'antd';
import { ReloadOutlined, EditOutlined, PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { ratingApi } from '../../services/api';
import { RatingConfig as RatingConfigType, ScoringCriterion } from '../../types';
import { useAuthContext } from '../../App';

const RatingConfig = () => {
  const [configs, setConfigs] = useState<RatingConfigType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<RatingConfigType | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuthContext();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await ratingApi.getConfigs();
      setConfigs(data);
    } catch (e) {
      console.error(e);
      message.error('加载评级配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: RatingConfigType) => {
    setCurrentConfig(config);
    form.setFieldsValue({
      name: config.name,
      weight: config.weight,
      scoringCriteria: config.scoringCriteria
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await ratingApi.updateConfig(currentConfig!.id, values);
      message.success('配置更新成功');
      setEditModalVisible(false);
      loadConfigs();
    } catch (e) {
      console.error(e);
      message.error('配置更新失败');
    }
  };

  const getDimensionColor = (dimension: string) => {
    const colorMap: Record<string, string> = {
      delivery: '#1890ff',
      quality: '#52c41a',
      service: '#faad14',
      price: '#722ed1'
    };
    return colorMap[dimension] || '#8c8c8c';
  };

  const getDimensionIcon = (dimension: string) => {
    const iconMap: Record<string, string> = {
      delivery: '🚚',
      quality: '✅',
      service: '💬',
      price: '💰'
    };
    return iconMap[dimension] || '⚙️';
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">评级配置</h2>
          <Button icon={<ReloadOutlined />} onClick={loadConfigs}>刷新</Button>
        </div>
      </div>

      <div className="page-content">
        <Row gutter={16}>
          {configs.map((config) => (
            <Col key={config.id} span={12}>
              <Card
                className="card-shadow"
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    <span style={{ fontSize: 20 }}>{getDimensionIcon(config.dimension)}</span>
                    <span>{config.name}</span>
                    <Tag color={getDimensionColor(config.dimension)} style={{ marginLeft: 8 }}>
                      权重 {config.weight}%
                    </Tag>
                  </Space>
                }
                extra={
                  isAdmin && (
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleEdit(config)}
                    >
                      编辑
                    </Button>
                  )
                }
              >
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>维度标识</span>
                  </div>
                </div>
                <List
                  size="small"
                  header={
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>
                      评分标准
                    </div>
                  }
                  dataSource={config.scoringCriteria}
                  renderItem={(item: ScoringCriterion) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.name}
                        description={
                          <div>
                            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                              {item.description}
                            </div>
                            <div style={{ fontSize: 12 }}>
                              范围: {item.minValue} - {item.maxValue} {item.unit}
                            </div>
                          </div>
                        }
                      />
                      <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                        {item.score} 分
                      </Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {configs.length > 0 && (
          <Card className="card-shadow" title="权重分配总览">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '20px 0' }}>
              {configs.map((config) => (
                <div key={config.id} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      border: `4px solid ${getDimensionColor(config.dimension)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: getDimensionColor(config.dimension)
                    }}
                  >
                    {config.weight}%
                  </div>
                  <div style={{ fontWeight: 500 }}>{config.name}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', color: '#999', marginTop: 8 }}>
              总权重: {configs.reduce((sum, c) => sum + c.weight, 0)}%
            </div>
          </Card>
        )}
      </div>

      <Modal
        title="编辑评级配置"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="维度名称" rules={[{ required: true, message: '请输入维度名称' }]}>
            <Input placeholder="请输入维度名称" />
          </Form.Item>
          <Form.Item name="weight" label="权重(%)" rules={[{ required: true, message: '请输入权重' }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="请输入权重" />
          </Form.Item>
          <Divider orientation="left">评分标准</Divider>
          <Form.List name="scoringCriteria">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => remove(field.name)}
                      >
                        删除
                      </Button>
                    }
                    title={`标准 ${index + 1}`}
                  >
                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'name']}
                          label="名称"
                          rules={[{ required: true, message: '请输入名称' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input size="small" placeholder="名称" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'score']}
                          label="得分"
                          rules={[{ required: true, message: '请输入得分' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber size="small" min={0} max={100} style={{ width: '100%' }} placeholder="得分" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'unit']}
                          label="单位"
                          rules={[{ required: true, message: '请输入单位' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input size="small" placeholder="单位" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'minValue']}
                          label="最小值"
                          rules={[{ required: true, message: '请输入最小值' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber size="small" style={{ width: '100%' }} placeholder="最小值" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'maxValue']}
                          label="最大值"
                          rules={[{ required: true, message: '请输入最大值' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber size="small" style={{ width: '100%' }} placeholder="最大值" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      {...field}
                      name={[field.name, 'description']}
                      label="描述"
                      style={{ marginBottom: 0, marginTop: 8 }}
                    >
                      <Input size="small" placeholder="描述" />
                    </Form.Item>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  添加评分标准
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default RatingConfig;
