import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, DatePicker, InputNumber, message, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { orderApi, supplierApi } from '../../services/api';
import { formatMoney, formatDate, orderStatusMap } from '../../utils/format';
import { ProcessingOrder } from '../../types';
import dayjs from 'dayjs';
import { useAuthContext } from '../../App';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ProcessingOrders = () => {
  const [orders, setOrders] = useState<ProcessingOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [factories, setFactories] = useState<any[]>([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadOrders();
  }, [page, pageSize, status, keyword]);

  useEffect(() => {
    if (user?.role === 'demander') {
      loadFactories();
    }
  }, [user]);

  const loadFactories = async () => {
    try {
      const data = await supplierApi.getSuppliers({ type: 'factory', pageSize: 100 });
      setFactories(data.records);
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (keyword) params.keyword = keyword;
      
      const data = await orderApi.getProcessingOrders(params);
      setOrders(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const data = {
        ...values,
        deliveryDate: values.deliveryDate?.toISOString(),
        unitPrice: Number(values.unitPrice)
      };
      await orderApi.createProcessingOrder(data);
      message.success('订单创建成功');
      setModalVisible(false);
      form.resetFields();
      loadOrders();
    } catch (e: any) {
      message.error(e.message || '创建失败');
    }
  };

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text: string, record: ProcessingOrder) => (
        <a onClick={() => navigate(`/orders/processing/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '零件名称',
      dataIndex: 'partName',
      key: 'partName'
    },
    {
      title: '零件编号',
      dataIndex: 'partCode',
      key: 'partCode'
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number, record: ProcessingOrder) => `${val} 件`
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: user?.role === 'demander' ? '加工厂' : '需求方',
      dataIndex: user?.role === 'demander' ? 'factoryName' : 'demanderName',
      key: 'partner'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = orderStatusMap[status as keyof typeof orderStatusMap] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '交货日期',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      render: (val: string) => formatDate(val)
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => formatDate(val)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ProcessingOrder) => (
        <Button type="link" onClick={() => navigate(`/orders/processing/${record.id}`)}>
          查看详情
        </Button>
      )
    }
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending_review', label: '待审核' },
    { value: 'reviewed', label: '已接单' },
    { value: 'scheduled', label: '排产中' },
    { value: 'processing', label: '加工中' },
    { value: 'initial_inspection', label: '初检' },
    { value: 'reinspection', label: '复检' },
    { value: 'packaging', label: '包装中' },
    { value: 'shipped', label: '已发货' },
    { value: 'delivered', label: '已送达' },
    { value: 'completed', label: '已完成' }
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">加工订单</h2>
          {user?.role === 'demander' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              新建订单
            </Button>
          )}
        </div>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索订单号/零件名称/编号"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="订单状态"
              style={{ width: 150 }}
              value={status || undefined}
              onChange={val => setStatus(val || '')}
              allowClear
            >
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadOrders}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              }
            }}
          />
        </Card>
      </div>

      <Modal
        title="新建加工订单"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="partName"
                label="零件名称"
                rules={[{ required: true, message: '请输入零件名称' }]}
              >
                <Input placeholder="请输入零件名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="partCode"
                label="零件编号"
                rules={[{ required: true, message: '请输入零件编号' }]}
              >
                <Input placeholder="请输入零件编号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="数量"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入数量" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unitPrice"
                label="单价（元）"
                rules={[{ required: true, message: '请输入单价' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入单价" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="factoryId"
                label="选择加工厂"
                rules={[{ required: true, message: '请选择加工厂' }]}
              >
                <Select placeholder="请选择加工厂">
                  {factories.map(f => (
                    <Option key={f.id} value={f.id}>{f.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deliveryDate"
                label="交货日期"
                rules={[{ required: true, message: '请选择交货日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择交货日期" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lossRateThreshold"
                label="损耗率阈值(%)"
                initialValue={3}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="defectRateThreshold"
                label="不良率阈值(%)"
                initialValue={2}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="processStandard" label="工艺标准">
            <Input placeholder="请输入工艺标准" />
          </Form.Item>
          <Form.Item name="toleranceRequirement" label="公差要求">
            <Input placeholder="请输入公差要求" />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProcessingOrders;
