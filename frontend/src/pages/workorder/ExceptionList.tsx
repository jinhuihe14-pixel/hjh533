import { useState, useEffect } from 'react';
import { Table, Card, Button, Select, Tag, Space, message, Modal, Form, Input, Descriptions, Image, Divider } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { workorderApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { WorkOrderException } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const exceptionStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  processing: { text: '处理中', color: 'blue' },
  resolved: { text: '已解决', color: 'green' },
  rejected: { text: '已驳回', color: 'red' }
};

const exceptionSeverityMap: Record<string, { text: string; color: string }> = {
  low: { text: '低', color: 'blue' },
  medium: { text: '中', color: 'orange' },
  high: { text: '高', color: 'red' }
};

const exceptionTypeMap: Record<string, string> = {
  process: '工艺异常',
  material: '材料异常',
  equipment: '设备异常',
  other: '其他异常'
};

const ExceptionList = () => {
  const [exceptions, setExceptions] = useState<WorkOrderException[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [handleVisible, setHandleVisible] = useState(false);
  const [resolveVisible, setResolveVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentException, setCurrentException] = useState<WorkOrderException | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [handleForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadExceptions();
  }, [page, pageSize, status, type, severity]);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (type) params.type = type;
      if (severity) params.severity = severity;
      
      const data = await workorderApi.getExceptions(params);
      setExceptions(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载异常列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadExceptions();
  };

  const handleReset = () => {
    setStatus('');
    setType('');
    setSeverity('');
    setPage(1);
  };

  const openHandle = (record: WorkOrderException) => {
    setCurrentException(record);
    setHandleVisible(true);
  };

  const openResolve = (record: WorkOrderException) => {
    setCurrentException(record);
    setResolveVisible(true);
  };

  const openDetail = async (record: WorkOrderException) => {
    setDetailLoading(true);
    try {
      const data = await workorderApi.getException(record.id);
      setCurrentException(data);
      setDetailVisible(true);
    } catch (e) {
      console.error(e);
      message.error('加载异常详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleHandle = async (values: any) => {
    try {
      await workorderApi.handleException(currentException!.id, values);
      message.success('异常已处理');
      setHandleVisible(false);
      handleForm.resetFields();
      loadExceptions();
    } catch (e: any) {
      message.error(e.message || '处理异常失败');
    }
  };

  const handleResolve = async (values: any) => {
    try {
      await workorderApi.resolveException(currentException!.id, values.resolution);
      message.success('异常已解决');
      setResolveVisible(false);
      resolveForm.resetFields();
      loadExceptions();
    } catch (e: any) {
      message.error(e.message || '解决异常失败');
    }
  };

  const canHandle = user?.role === 'admin' || user?.role === 'demander';

  const columns = [
    {
      title: '异常ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (text: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>
      )
    },
    {
      title: '工单号',
      dataIndex: 'workOrderId',
      key: 'workOrderId',
      render: (_: string, record: WorkOrderException) => (
        <a onClick={() => navigate(`/workorder/${record.workOrderId}`)}>
          {record.workOrder?.workOrderNo || '查看'}
        </a>
      )
    },
    {
      title: '异常类型',
      dataIndex: 'typeName',
      key: 'typeName',
      render: (text: string, record: WorkOrderException) => (
        <Tag color="blue">{text || exceptionTypeMap[record.type] || record.type}</Tag>
      )
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const info = exceptionSeverityMap[severity] || { text: severity, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '上报人',
      dataIndex: 'reporterName',
      key: 'reporterName'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = exceptionStatusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '上报时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date)
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: WorkOrderException) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canHandle && record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => openHandle(record)}>
              处理
            </Button>
          )}
          {canHandle && record.status === 'processing' && (
            <Button type="link" size="small" onClick={() => openResolve(record)}>
              解决
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>异常管理</h2>
          </div>

          <Space wrap>
            <Select
              placeholder="状态"
              style={{ width: 150 }}
              value={status || undefined}
              onChange={setStatus}
              allowClear
            >
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已解决</Option>
              <Option value="rejected">已驳回</Option>
            </Select>
            <Select
              placeholder="异常类型"
              style={{ width: 150 }}
              value={type || undefined}
              onChange={setType}
              allowClear
            >
              <Option value="process">工艺异常</Option>
              <Option value="material">材料异常</Option>
              <Option value="equipment">设备异常</Option>
              <Option value="other">其他异常</Option>
            </Select>
            <Select
              placeholder="严重程度"
              style={{ width: 150 }}
              value={severity || undefined}
              onChange={setSeverity}
              allowClear
            >
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
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
            dataSource={exceptions}
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
        title="处理异常"
        open={handleVisible}
        onCancel={() => setHandleVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={handleForm} layout="vertical" onFinish={handleHandle}>
          <Form.Item
            name="handlerRemark"
            label="处理说明"
            rules={[{ required: true, message: '请输入处理说明' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入处理说明" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认处理</Button>
              <Button onClick={() => setHandleVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="解决异常"
        open={resolveVisible}
        onCancel={() => setResolveVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={resolveForm} layout="vertical" onFinish={handleResolve}>
          <Form.Item
            name="resolution"
            label="解决方案"
            rules={[{ required: true, message: '请输入解决方案' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细描述解决方案" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认解决</Button>
              <Button onClick={() => setResolveVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="异常详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
        destroyOnClose
      >
        {currentException && (
          <div style={{ position: 'relative' }}>
            {detailLoading && <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>}
            
            <Space style={{ marginBottom: 16 }}>
              <Tag color={exceptionSeverityMap[currentException.severity]?.color || 'default'}>
                {exceptionSeverityMap[currentException.severity]?.text || currentException.severity}
              </Tag>
              <Tag color={exceptionStatusMap[currentException.status]?.color || 'default'}>
                {exceptionStatusMap[currentException.status]?.text || currentException.status}
              </Tag>
              <Tag color="blue">
                {exceptionTypeMap[currentException.type] || currentException.type}
              </Tag>
            </Space>

            <Divider orientation="left" style={{ margin: '8px 0' }}>基本信息</Divider>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="异常ID">
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{currentException.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="关联工单">
                <a onClick={() => {
                  setDetailVisible(false);
                  navigate(`/workorder/${currentException.workOrderId}`);
                }}>
                  {(currentException as any).workOrder?.workOrderNo || currentException.workOrderId || '查看'}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="异常类型">
                {exceptionTypeMap[currentException.type] || currentException.type}
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                {exceptionSeverityMap[currentException.severity]?.text || currentException.severity}
              </Descriptions.Item>
              <Descriptions.Item label="上报人">
                {currentException.reporterName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上报时间">
                {formatDateTime(currentException.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                {exceptionStatusMap[currentException.status]?.text || currentException.status}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ margin: '16px 0 8px 0' }}>异常描述</Divider>
            <p style={{ color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {currentException.description || '暂无描述'}
            </p>

            {currentException.handlerName && (
              <>
                <Divider orientation="left" style={{ margin: '16px 0 8px 0' }}>处理信息</Divider>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="处理人">
                    {currentException.handlerName}
                  </Descriptions.Item>
                  <Descriptions.Item label="处理说明">
                    {currentException.handlerRemark || '-'}
                  </Descriptions.Item>
                  {currentException.handledAt && (
                    <Descriptions.Item label="处理时间">
                      {formatDateTime(currentException.handledAt)}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            {currentException.resolution && (
              <>
                <Divider orientation="left" style={{ margin: '16px 0 8px 0' }}>解决方案</Divider>
                <p style={{ color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {currentException.resolution}
                </p>
                {currentException.resolvedAt && (
                  <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                    解决时间：{formatDateTime(currentException.resolvedAt)}
                  </p>
                )}
              </>
            )}

            {currentException.photos && currentException.photos.length > 0 && (
              <>
                <Divider orientation="left" style={{ margin: '16px 0 8px 0' }}>现场照片</Divider>
                <Image.PreviewGroup>
                  <Space wrap>
                    {currentException.photos.map((img: string, index: number) => (
                      <Image
                        key={index}
                        width={100}
                        height={100}
                        src={img}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExceptionList;
