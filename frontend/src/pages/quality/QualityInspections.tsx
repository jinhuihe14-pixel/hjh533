import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message, Modal, Form, InputNumber } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, ToolOutlined, RollbackOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { qualityApi } from '../../services/api';
import { formatDate } from '../../utils/format';
import { QualityInspection } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const QualityInspections = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [type, setType] = useState('');
  const [result, setResult] = useState('');
  const [keyword, setKeyword] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [reworkModal, setReworkModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<QualityInspection | null>(null);
  const [form] = Form.useForm();
  const [reworkForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadInspections();
  }, [page, pageSize, type, result, keyword]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (type) params.type = type;
      if (result) params.result = result;
      if (keyword) params.keyword = keyword;
      
      const data = await qualityApi.getInspections(params);
      setInspections(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载质检单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadInspections();
  };

  const handleReset = () => {
    setKeyword('');
    setType('');
    setResult('');
    setPage(1);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await qualityApi.createInspection(values);
      message.success('质检单创建成功');
      setCreateModal(false);
      form.resetFields();
      loadInspections();
    } catch (e) {
      console.error(e);
      message.error('质检单创建失败');
    }
  };

  const openRework = (record: QualityInspection) => {
    setCurrentInspection(record);
    reworkForm.setFieldsValue({
      quantity: record.failedQuantity,
      reason: record.defectItems?.map((d: any) => d.name).join('、') || '质检不合格'
    });
    setReworkModal(true);
  };

  const handleRework = async () => {
    try {
      const values = await reworkForm.validateFields();
      await qualityApi.initiateRework(currentInspection!.id, values);
      message.success('返工单创建成功');
      setReworkModal(false);
      reworkForm.resetFields();
      loadInspections();
    } catch (e: any) {
      console.error(e);
      message.error(e.response?.data?.message || '返工单创建失败');
    }
  };

  const openReturn = (record: QualityInspection) => {
    setCurrentInspection(record);
    returnForm.setFieldsValue({
      quantity: record.failedQuantity,
      reason: '质检不合格'
    });
    setReturnModal(true);
  };

  const handleReturn = async () => {
    try {
      const values = await returnForm.validateFields();
      await qualityApi.initiateReturn(currentInspection!.id, values);
      message.success('退货单创建成功');
      setReturnModal(false);
      returnForm.resetFields();
      loadInspections();
    } catch (e: any) {
      console.error(e);
      message.error(e.response?.data?.message || '退货单创建失败');
    }
  };

  const getResultTag = (result: string) => {
    const colorMap: Record<string, string> = {
      pass: 'green',
      fail: 'red',
      pending: 'orange'
    };
    const textMap: Record<string, string> = {
      pass: '合格',
      fail: '不合格',
      pending: '待检验'
    };
    return <Tag color={colorMap[result]}>{textMap[result]}</Tag>;
  };

  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      incoming: { text: '来料检验', color: 'blue' },
      initial: { text: '初检', color: 'cyan' },
      reinspection: { text: '复检', color: 'purple' },
      spot_check: { text: '抽检', color: 'gold' }
    };
    const info = typeMap[type] || { text: type, color: 'default' };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const columns = [
    {
      title: '质检单号',
      dataIndex: 'inspectionNo',
      key: 'inspectionNo',
      render: (text: string, record: QualityInspection) => (
        <a onClick={() => navigate(`/quality/inspections/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '质检类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => getTypeTag(type)
    },
    {
      title: '批次号',
      dataIndex: 'batchId',
      key: 'batchId'
    },
    {
      title: '检验员',
      dataIndex: 'inspectorName',
      key: 'inspectorName'
    },
    {
      title: '送检数量',
      dataIndex: 'inspectedQuantity',
      key: 'inspectedQuantity'
    },
    {
      title: '合格数',
      dataIndex: 'passedQuantity',
      key: 'passedQuantity'
    },
    {
      title: '不合格数',
      dataIndex: 'failedQuantity',
      key: 'failedQuantity'
    },
    {
      title: '不良率',
      dataIndex: 'defectRate',
      key: 'defectRate',
      render: (rate: number) => `${rate}%`
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => getResultTag(result)
    },
    {
      title: '检验时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date)
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: QualityInspection) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => navigate(`/quality/inspections/${record.id}`)}>
            详情
          </Button>
          {record.result === 'fail' && (user?.role === 'demander' || user?.role === 'admin') && (
            <>
              <Button 
                type="link" 
                size="small" 
                icon={<ToolOutlined />} 
                onClick={() => openRework(record)}
                disabled={!!record.reworkOrderId}
              >
                {record.reworkOrderId ? '已返工' : '发起返工'}
              </Button>
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<RollbackOutlined />} 
                onClick={() => openReturn(record)}
              >
                退货
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  const canCreate = user?.role === 'demander' || user?.role === 'admin' || user?.role === 'factory';

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>质检单管理</h2>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                创建质检单
              </Button>
            )}
          </div>

          <Space wrap>
            <Input
              placeholder="搜索质检单号"
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Select
              placeholder="质检类型"
              style={{ width: 150 }}
              value={type || undefined}
              onChange={setType}
              allowClear
            >
              <Option value="incoming">来料检验</Option>
              <Option value="initial">初检</Option>
              <Option value="reinspection">复检</Option>
              <Option value="spot_check">抽检</Option>
            </Select>
            <Select
              placeholder="质检结果"
              style={{ width: 150 }}
              value={result || undefined}
              onChange={setResult}
              allowClear
            >
              <Option value="pass">合格</Option>
              <Option value="fail">不合格</Option>
              <Option value="pending">待检验</Option>
            </Select>
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>

          <Table
            columns={columns}
            dataSource={inspections}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              }
            }}
          />
        </Space>
      </Card>

      <Modal
        title="创建质检单"
        open={createModal}
        onOk={handleCreate}
        onCancel={() => setCreateModal(false)}
        width={600}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="质检类型" rules={[{ required: true }]}>
            <Select>
              <Option value="incoming">来料检验</Option>
              <Option value="initial">初检</Option>
              <Option value="reinspection">复检</Option>
              <Option value="spot_check">抽检</Option>
            </Select>
          </Form.Item>
          <Form.Item name="orderId" label="订单ID" rules={[{ required: true }]}>
            <Input placeholder="请输入订单ID" />
          </Form.Item>
          <Form.Item name="orderType" label="订单类型" initialValue="processing">
            <Select>
              <Option value="processing">加工订单</Option>
              <Option value="material">原料订单</Option>
            </Select>
          </Form.Item>
          <Form.Item name="batchId" label="批次ID" rules={[{ required: true }]}>
            <Input placeholder="请输入批次ID" />
          </Form.Item>
          <Form.Item label="检验数量">
            <Space>
              <Form.Item name="totalQuantity" noStyle rules={[{ required: true }]}>
                <InputNumber min={0} placeholder="总数量" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="inspectedQuantity" noStyle rules={[{ required: true }]}>
                <InputNumber min={0} placeholder="抽检数量" style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item label="结果数量">
            <Space>
              <Form.Item name="passedQuantity" noStyle rules={[{ required: true }]}>
                <InputNumber min={0} placeholder="合格数" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="failedQuantity" noStyle rules={[{ required: true }]}>
                <InputNumber min={0} placeholder="不合格数" style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="defectRate" label="不良率(%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="result" label="质检结果" rules={[{ required: true }]}>
            <Select>
              <Option value="pass">合格</Option>
              <Option value="fail">不合格</Option>
              <Option value="pending">待检验</Option>
            </Select>
          </Form.Item>
          <Form.Item name="disposition" label="处置方式">
            <Select>
              <Option value="rework">返工</Option>
              <Option value="return">退货</Option>
              <Option value="concession">特采</Option>
              <Option value="scrap">报废</Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发起返工"
        open={reworkModal}
        onOk={handleRework}
        onCancel={() => setReworkModal(false)}
        width={500}
        okText="确认提交"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={reworkForm} layout="vertical">
          <Form.Item label="质检单号">
            <span style={{ color: '#666' }}>{currentInspection?.inspectionNo}</span>
          </Form.Item>
          <Form.Item name="quantity" label="返工数量" rules={[{ required: true, message: '请输入返工数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="返工原因" rules={[{ required: true, message: '请输入返工原因' }]}>
            <Input.TextArea rows={3} placeholder="请描述返工原因" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选补充说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发起退货"
        open={returnModal}
        onOk={handleReturn}
        onCancel={() => setReturnModal(false)}
        width={500}
        okText="确认提交"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={returnForm} layout="vertical">
          <Form.Item label="质检单号">
            <span style={{ color: '#666' }}>{currentInspection?.inspectionNo}</span>
          </Form.Item>
          <Form.Item name="quantity" label="退货数量" rules={[{ required: true, message: '请输入退货数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="退货原因" rules={[{ required: true, message: '请输入退货原因' }]}>
            <Input.TextArea rows={3} placeholder="请描述退货原因" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选补充说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QualityInspections;
