import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message, Modal, Form, QRCode } from 'antd';
import { SearchOutlined, ReloadOutlined, QrcodeOutlined, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { qualityApi } from '../../services/api';
import { formatDate } from '../../utils/format';
import { QualityBatch } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const QualityBatches = () => {
  const [batches, setBatches] = useState<QualityBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [overallResult, setOverallResult] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<QualityBatch | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadBatches();
  }, [page, pageSize, keyword, overallResult]);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (keyword) params.keyword = keyword;
      if (overallResult) params.overallResult = overallResult;
      
      const data = await qualityApi.getBatches(params);
      setBatches(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载批次列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadBatches();
  };

  const handleReset = () => {
    setKeyword('');
    setOverallResult('');
    setPage(1);
  };

  const showQrCode = (batch: QualityBatch) => {
    setCurrentBatch(batch);
    setQrModal(true);
  };

  const handleBatchPrint = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要打印的批次');
      return;
    }
    try {
      const data: any = await qualityApi.batchPrint(selectedRowKeys as string[]);
      message.success(`已生成 ${data.count} 个批次的打印数据`);
      setSelectedRowKeys([]);
    } catch (e) {
      message.error('批量打印失败');
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await qualityApi.createBatch(values);
      message.success('批次创建成功');
      setCreateModal(false);
      form.resetFields();
      loadBatches();
    } catch (e) {
      console.error(e);
      message.error('批次创建失败');
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

  const columns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      render: (text: string, record: QualityBatch) => (
        <a onClick={() => navigate(`/quality/batches/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '溯源编码',
      dataIndex: 'traceCode',
      key: 'traceCode',
      render: (text: string) => (
        <Space>
          <span style={{ fontFamily: 'monospace' }}>{text}</span>
          <Button
            type="text"
            size="small"
            icon={<QrcodeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              const batch = batches.find(b => b.traceCode === text);
              if (batch) showQrCode(batch);
            }}
          />
        </Space>
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
      key: 'quantity'
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName'
    },
    {
      title: '加工厂',
      dataIndex: 'factoryName',
      key: 'factoryName'
    },
    {
      title: '质检结果',
      dataIndex: 'overallResult',
      key: 'overallResult',
      render: (result: string) => getResultTag(result)
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date)
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: QualityBatch) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => navigate(`/quality/batches/${record.id}`)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => showQrCode(record)}>
            溯源码
          </Button>
        </Space>
      )
    }
  ];

  const canCreate = user?.role === 'demander' || user?.role === 'admin';

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>质量批次管理</h2>
            <Space>
              <Button
                icon={<PrinterOutlined />}
                onClick={handleBatchPrint}
                disabled={selectedRowKeys.length === 0}
              >
                批量打印
              </Button>
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                  创建批次
                </Button>
              )}
            </Space>
          </div>

          <Space wrap>
            <Input
              placeholder="搜索批次号/溯源码/零件"
              style={{ width: 250 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Select
              placeholder="质检结果"
              style={{ width: 150 }}
              value={overallResult || undefined}
              onChange={setOverallResult}
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
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys
            }}
            columns={columns}
            dataSource={batches}
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
        title="创建质量批次"
        open={createModal}
        onOk={handleCreate}
        onCancel={() => setCreateModal(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="orderId" label="关联订单">
            <Input placeholder="订单ID" />
          </Form.Item>
          <Form.Item name="orderType" label="订单类型" initialValue="processing">
            <Select>
              <Option value="processing">加工订单</Option>
              <Option value="material">原料订单</Option>
            </Select>
          </Form.Item>
          <Form.Item name="partName" label="零件名称" rules={[{ required: true }]}>
            <Input placeholder="请输入零件名称" />
          </Form.Item>
          <Form.Item name="partCode" label="零件编号" rules={[{ required: true }]}>
            <Input placeholder="请输入零件编号" />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入数量" />
          </Form.Item>
          <Form.Item name="supplierId" label="供应商ID">
            <Input placeholder="供应商ID" />
          </Form.Item>
          <Form.Item name="factoryId" label="加工厂ID">
            <Input placeholder="加工厂ID" />
          </Form.Item>
          <Form.Item name="processStandard" label="工艺标准">
            <Input placeholder="工艺标准" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="溯源码"
        open={qrModal}
        onCancel={() => setQrModal(false)}
        footer={[
          <Button key="close" onClick={() => setQrModal(false)}>
            关闭
          </Button>
        ]}
      >
        {currentBatch && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <QRCode
              value={currentBatch.traceCode}
              size={200}
              style={{ margin: '0 auto' }}
            />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>
                {currentBatch.partName}
              </p>
              <p style={{ color: '#666', margin: '8px 0 0 0' }}>
                批次号: {currentBatch.batchNo}
              </p>
              <p style={{ fontFamily: 'monospace', color: '#999' }}>
                {currentBatch.traceCode}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QualityBatches;
